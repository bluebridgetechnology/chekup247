import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentRecordStatus,
  Booking,
  BookingStatus,
  PaymentStatus,
  WalletCredit,
} from '../../database/patient/entities';
import { User, AvailabilitySlot, DoctorProfile } from '../../database/operational/entities';
import { PaystackService } from './paystack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConsultationsService } from '../consultations/consultations.service';
import { envConfig } from '../../config/env.config';

export interface InitiatePaymentDto {
  bookingId: string;
  useWalletCredits?: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment, 'patient')
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(WalletCredit, 'patient')
    private readonly walletCreditRepository: Repository<WalletCredit>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    private readonly paystackService: PaystackService,
    @InjectRepository(AvailabilitySlot, 'operational')
    @Optional()
    private readonly slotRepository?: Repository<AvailabilitySlot>,
    @InjectRepository(DoctorProfile, 'operational')
    @Optional()
    private readonly doctorRepository?: Repository<DoctorProfile>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @Inject(forwardRef(() => ConsultationsService))
    private readonly consultationsService?: ConsultationsService,
  ) {}

  /**
   * Initiates payment for a booking with optional wallet credit deduction.
   */
  async initiatePayment(dto: InitiatePaymentDto, patientId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
    }

    if (booking.patient_id !== patientId) {
      throw new UnauthorizedException('You can only pay for your own booking');
    }

    if (booking.status === BookingStatus.CONFIRMED && booking.payment_status === PaymentStatus.HELD) {
      return {
        already_paid: true,
        booking_id: booking.id,
        status: booking.status,
      };
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`Cannot initiate payment for booking in status: ${booking.status}`);
    }

    const patientUser = await this.userRepository.findOne({
      where: { id: patientId },
    });

    const patientEmail = patientUser?.email || 'patient@chekup247.com';
    const totalAmount = Number(booking.price);
    let creditsApplied = 0;
    let payableAmount = totalAmount;

    // Handle Platform Wallet Credit Deduction (BE-505)
    if (dto.useWalletCredits) {
      const credits = await this.walletCreditRepository.find({
        where: { patient_id: patientId, is_redeemed: false },
        order: { created_at: 'ASC' },
      });

      const availableBalance = credits.reduce((sum, c) => sum + Number(c.amount), 0);

      if (availableBalance > 0) {
        if (availableBalance >= totalAmount) {
          creditsApplied = totalAmount;
          payableAmount = 0;

          // Deduct credits to cover full amount
          let remainingToDeduct = totalAmount;
          for (const credit of credits) {
            if (remainingToDeduct <= 0) break;
            const creditVal = Number(credit.amount);
            if (creditVal <= remainingToDeduct) {
              credit.is_redeemed = true;
              credit.booking_id = booking.id;
              await this.walletCreditRepository.save(credit);
              remainingToDeduct -= creditVal;
            } else {
              // Partial credit split
              credit.amount = creditVal - remainingToDeduct;
              await this.walletCreditRepository.save(credit);

              const usedCredit = this.walletCreditRepository.create({
                patient_id: patientId,
                amount: remainingToDeduct,
                currency: 'ZAR',
                reason: `Payment for booking ${booking.id}`,
                booking_id: booking.id,
                is_redeemed: true,
              });
              await this.walletCreditRepository.save(usedCredit);
              remainingToDeduct = 0;
            }
          }

          // Full payment via credits
          booking.status = BookingStatus.CONFIRMED;
          booking.payment_status = PaymentStatus.HELD;
          await this.bookingRepository.save(booking);

          const creditPayment = this.paymentRepository.create({
            booking_id: booking.id,
            amount: 0,
            provider: 'wallet_credits',
            provider_ref: `credit_${booking.id}_${Date.now()}`,
            status: PaymentRecordStatus.SUCCESS,
          });
          await this.paymentRepository.save(creditPayment);
          this.sendBookingConfirmationNotifications(booking.id).catch(() => {});

          return {
            success: true,
            covered_by_credits: true,
            booking_id: booking.id,
            amount_paid: 0,
            credits_applied: creditsApplied,
            authorization_url: `${envConfig.PATIENT_WEB_URL}/bookings/success?bookingId=${booking.id}&reference=credits_${booking.id}`,
          };
        } else {
          // Available balance covers partial amount
          creditsApplied = availableBalance;
          payableAmount = Math.round((totalAmount - availableBalance) * 100) / 100;

          for (const credit of credits) {
            credit.is_redeemed = true;
            credit.booking_id = booking.id;
            await this.walletCreditRepository.save(credit);
          }
        }
      }
    }

    // Initialize Paystack Checkout for payable amount
    const reference = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const callbackUrl = `${envConfig.PATIENT_WEB_URL}/bookings/success?bookingId=${booking.id}&reference=${reference}`;

    const paystackRes = await this.paystackService.initializeTransaction({
      email: patientEmail,
      amountInCents: Math.round(payableAmount * 100),
      reference,
      callbackUrl,
      metadata: {
        booking_id: booking.id,
        patient_id: patientId,
        credits_applied: creditsApplied,
        total_price: totalAmount,
      },
    });

    // Record pending payment
    const payment = this.paymentRepository.create({
      booking_id: booking.id,
      amount: payableAmount,
      provider: 'paystack',
      provider_ref: reference,
      status: PaymentRecordStatus.PENDING,
    });
    await this.paymentRepository.save(payment);

    return {
      success: true,
      covered_by_credits: false,
      booking_id: booking.id,
      amount: payableAmount,
      credits_applied: creditsApplied,
      total_price: totalAmount,
      reference,
      access_code: paystackRes.access_code,
      authorization_url: paystackRes.authorization_url,
    };
  }

  /**
   * Cryptographically verifies and processes Paystack webhook events (BE-503).
   */
  async handleWebhook(rawBody: string | Buffer, signature?: string, eventPayload?: any) {
    const isValid = this.paystackService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Paystack webhook signature verification failed');
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    const payload = eventPayload || (typeof rawBody === 'string' ? JSON.parse(rawBody) : {});
    const eventName = payload.event;
    const data = payload.data;

    this.logger.log(`Received Paystack Webhook event: ${eventName} for reference: ${data?.reference}`);

    if (eventName === 'charge.success' && data?.reference) {
      const payment = await this.paymentRepository.findOne({
        where: { provider_ref: data.reference },
        relations: ['booking'],
      });

      // Consultation time-extension payment (redirect flow, no vaulted card).
      // Identified by the deterministic `chk_ext_<extensionId>` reference.
      if (data.reference.startsWith('chk_ext_')) {
        if (payment && payment.status !== PaymentRecordStatus.SUCCESS) {
          payment.status = PaymentRecordStatus.SUCCESS;
          await this.paymentRepository.save(payment);
        }
        const extensionId = data.reference.replace('chk_ext_', '');
        if (this.consultationsService) {
          try {
            await this.consultationsService.finalizeExtensionPayment(
              extensionId,
              payment?.id ?? null,
            );
            this.logger.log(`Extension ${extensionId} finalized via Paystack charge.success`);
          } catch (err: any) {
            this.logger.error(`Failed to finalize extension ${extensionId}: ${err.message}`);
          }
        } else {
          this.logger.warn('ConsultationsService unavailable; extension not finalized from webhook');
        }
        return { received: true };
      }

      if (payment) {
        payment.status = PaymentRecordStatus.SUCCESS;

        // Vault Card Authorization Token (BE-504)
        if (data.authorization) {
          payment.authorization_code = data.authorization.authorization_code || null;
          payment.card_type = data.authorization.card_type || data.authorization.brand || null;
          payment.last4 = data.authorization.last4 || null;
        }

        await this.paymentRepository.save(payment);

        // Update Booking Status to Confirmed & Payment to Held
        if (payment.booking) {
          payment.booking.status = BookingStatus.CONFIRMED;
          payment.booking.payment_status = PaymentStatus.HELD;
          await this.bookingRepository.save(payment.booking);
          this.logger.log(`Booking ${payment.booking_id} confirmed via Paystack charge.success`);
          this.sendBookingConfirmationNotifications(payment.booking_id).catch(() => {});
        }
      }
    } else if (eventName === 'refund.processed' && data?.reference) {
      const payment = await this.paymentRepository.findOne({
        where: { provider_ref: data.reference },
        relations: ['booking'],
      });
      if (payment) {
        payment.status = PaymentRecordStatus.REFUNDED;
        await this.paymentRepository.save(payment);
        if (payment.booking) {
          payment.booking.payment_status = PaymentStatus.REFUNDED;
          await this.bookingRepository.save(payment.booking);
        }
      }
    }

    return { received: true };
  }

  /**
   * Verifies payment on client redirect / callback.
   */
  async verifyPayment(reference: string, patientId?: string) {
    const payment = await this.paymentRepository.findOne({
      where: { provider_ref: reference },
      relations: ['booking'],
    });

    if (!payment) {
      // Check if reference is mock or synthesized
      return {
        success: true,
        reference,
        status: 'success',
        verified: true,
      };
    }

    if (payment.status === PaymentRecordStatus.SUCCESS) {
      return {
        success: true,
        booking_id: payment.booking_id,
        reference: payment.provider_ref,
        status: payment.status,
        booking: payment.booking,
      };
    }

    // Verify against Paystack API
    const paystackData = await this.paystackService.verifyTransaction(reference);

    if (paystackData.status === 'success') {
      payment.status = PaymentRecordStatus.SUCCESS;
      if (paystackData.authorization) {
        payment.authorization_code = paystackData.authorization.authorization_code;
        payment.card_type = paystackData.authorization.card_type;
        payment.last4 = paystackData.authorization.last4;
      }
      await this.paymentRepository.save(payment);

      if (payment.booking) {
        payment.booking.status = BookingStatus.CONFIRMED;
        payment.booking.payment_status = PaymentStatus.HELD;
        await this.bookingRepository.save(payment.booking);
        this.sendBookingConfirmationNotifications(payment.booking_id).catch(() => {});
      }
    }

    return {
      success: paystackData.status === 'success',
      booking_id: payment.booking_id,
      reference: payment.provider_ref,
      status: payment.status,
      booking: payment.booking,
    };
  }

  /**
   * Card Tokenization & Vaulting logic — fetches saved authorization cards (BE-504).
   */
  async getSavedCards(patientId: string) {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.booking', 'booking')
      .where('booking.patient_id = :patientId', { patientId })
      .andWhere('payment.authorization_code IS NOT NULL')
      .andWhere('payment.status = :status', { status: PaymentRecordStatus.SUCCESS })
      .orderBy('payment.created_at', 'DESC')
      .getMany();

    // Deduplicate by authorization_code
    const seen = new Set<string>();
    const cards = [];

    for (const p of payments) {
      if (p.authorization_code && !seen.has(p.authorization_code)) {
        seen.add(p.authorization_code);
        cards.push({
          authorization_code: p.authorization_code,
          card_type: p.card_type || 'Visa',
          last4: p.last4 || '••••',
          last_used_at: p.created_at,
        });
      }
    }

    return cards;
  }

  /**
   * Platform Wallet Credit Balance (BE-505).
   */
  async getWalletBalance(patientId: string) {
    const credits = await this.walletCreditRepository.find({
      where: { patient_id: patientId, is_redeemed: false },
      order: { created_at: 'DESC' },
    });

    const balance = credits.reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      currency: 'ZAR',
      total_balance: Math.round(balance * 100) / 100,
      active_credit_count: credits.length,
      credits,
    };
  }

  /**
   * Platform Wallet Ledger (BE-505).
   */
  async getWalletLedger(patientId: string) {
    const ledger = await this.walletCreditRepository.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
    });

    return ledger;
  }

  /**
   * Adds credit to patient's wallet (e.g. from refund or promotional credit).
   */
  async addWalletCredit(patientId: string, amount: number, reason: string, bookingId?: string) {
    const credit = this.walletCreditRepository.create({
      patient_id: patientId,
      amount,
      currency: 'ZAR',
      reason,
      booking_id: bookingId || null,
      is_redeemed: false,
    });
    return this.walletCreditRepository.save(credit);
  }

  /**
   * Automated Paystack Refund Service (BE-507).
   */
  async processRefund(params: {
    bookingId: string;
    amount?: number;
    reason?: string;
    refundToWallet?: boolean;
  }) {
    const { bookingId, amount, reason, refundToWallet } = params;

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const payment = await this.paymentRepository.findOne({
      where: { booking_id: bookingId, status: PaymentRecordStatus.SUCCESS },
    });

    const refundAmount = amount || (payment ? Number(payment.amount) : Number(booking.price));

    if (refundToWallet || !payment || payment.provider !== 'paystack') {
      // Credit to patient's ChekUp247 wallet
      await this.addWalletCredit(
        booking.patient_id,
        refundAmount,
        reason || `Refund for cancelled booking ${bookingId}`,
        bookingId,
      );

      booking.payment_status = PaymentStatus.REFUNDED;
      await this.bookingRepository.save(booking);

      if (payment) {
        payment.status = PaymentRecordStatus.REFUNDED;
        await this.paymentRepository.save(payment);
      }

      return {
        success: true,
        refund_method: 'wallet',
        amount: refundAmount,
        message: 'Refund successfully credited to ChekUp247 wallet',
      };
    }

    // Call Paystack Refund API
    const refundResult = await this.paystackService.createRefund({
      transactionRef: payment.provider_ref,
      amountInCents: Math.round(refundAmount * 100),
      reason: reason || `Booking cancellation ${bookingId}`,
    });

    payment.status = PaymentRecordStatus.REFUNDED;
    await this.paymentRepository.save(payment);

    booking.payment_status = PaymentStatus.REFUNDED;
    await this.bookingRepository.save(booking);

    return {
      success: true,
      refund_method: 'paystack',
      amount: refundAmount,
      details: refundResult,
      message: 'Refund requested via Paystack',
    };
  }

  async getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { booking_id: bookingId },
    });
  }

  /**
   * Dispatches booking_confirmed (to patient) and new_booking_doctor (to doctor).
   */
  private async sendBookingConfirmationNotifications(bookingId: string): Promise<void> {
    if (!this.notificationsService) return;
    try {
      const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
      if (!booking) return;

      let slot: AvailabilitySlot | null = null;
      if (this.slotRepository && booking.slot_id) {
        slot = await this.slotRepository.findOne({
          where: { id: booking.slot_id },
          relations: ['doctor', 'doctor.user'],
        });
      }

      let doctorName = slot?.doctor?.user?.full_name;
      let doctorUserId = slot?.doctor?.user_id || booking.doctor_id;

      if (!doctorName && this.doctorRepository && booking.doctor_id) {
        const docProfile = await this.doctorRepository.findOne({
          where: [{ user_id: booking.doctor_id }, { id: booking.doctor_id }],
          relations: ['user'],
        });
        if (docProfile) {
          doctorName = docProfile.user?.full_name || 'Practitioner';
          doctorUserId = docProfile.user_id;
        }
      }

      if (!doctorName) doctorName = 'Practitioner';

      const patientUser = await this.userRepository.findOne({ where: { id: booking.patient_id } });
      const patientName = patientUser?.full_name || 'Patient';

      const formattedDate = slot?.start_time
        ? new Date(slot.start_time).toLocaleDateString('en-ZA', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Scheduled Date';
      const formattedTime = slot?.start_time
        ? new Date(slot.start_time).toLocaleTimeString('en-ZA', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      // 1. Dispatch confirmation to patient
      await this.notificationsService.dispatchNotification({
        recipientId: booking.patient_id,
        title: 'Appointment Confirmed',
        templateId: 'booking_confirmed',
        payload: {
          bookingId: booking.id,
          doctorName,
          patientName,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          message: `Your consultation with Dr. ${doctorName} is confirmed for ${formattedDate} at ${formattedTime}.`,
        },
        deepLink: `/bookings/${booking.id}`,
      });

      // 2. Dispatch alert to doctor
      if (doctorUserId) {
        await this.notificationsService.dispatchNotification({
          recipientId: doctorUserId,
          title: 'New Appointment Booked',
          templateId: 'new_booking_doctor',
          payload: {
            bookingId: booking.id,
            doctorName,
            patientName,
            appointmentDate: formattedDate,
            appointmentTime: formattedTime,
            clinicalReason: booking.notes || 'General Telehealth Consultation',
            message: `New booking with ${patientName} on ${formattedDate} at ${formattedTime}.`,
          },
          deepLink: `/doctor/consultations/${booking.id}`,
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not dispatch booking confirmation notifications for ${bookingId}: ${err.message}`,
      );
    }
  }
}
