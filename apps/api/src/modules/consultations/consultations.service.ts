import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';
import {
  Consultation,
  ConsultationExtension,
  ExtensionStatus,
  Booking,
  BookingStatus,
  Payment,
  PaymentRecordStatus,
} from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User } from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import { DailyService } from './daily.service';
import { ConsultationGateway } from './consultation.gateway';
import { PaystackService } from '../payments/paystack.service';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    @InjectRepository(Consultation, 'patient')
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(ConsultationExtension, 'patient')
    private readonly extensionRepository: Repository<ConsultationExtension>,
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment, 'patient')
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(AvailabilitySlot, 'operational')
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    private readonly dailyService: DailyService,
    private readonly consultationGateway: ConsultationGateway,
    private readonly paystackService: PaystackService,
    @InjectQueue(QUEUES.NO_SHOW)
    private readonly noShowQueue: Queue,
  ) {}

  /**
   * Retrieves consultation by booking ID.
   */
  async getConsultationByBooking(bookingId: string): Promise<Consultation | null> {
    return this.consultationRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });
  }

  /**
   * Provisions a Daily.co private room upon booking confirmation (BE-601).
   * Also schedules the 10-minute automated no-show detection job (BE-604).
   */
  async provisionRoom(bookingId: string): Promise<Consultation> {
    const existing = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
    });
    if (existing) {
      return existing;
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    // Lookup availability slot on operational database
    let slotEndTime = new Date(Date.now() + 30 * 60 * 1000);
    let slotStartTime = new Date();

    if (booking.slot_id) {
      const slot = await this.slotRepository.findOne({
        where: { id: booking.slot_id },
      });
      if (slot) {
        slotStartTime = new Date(slot.start_time);
        slotEndTime = new Date(slot.end_time);
      }
    }

    // Create Daily.co private room with slot end + 15 min buffer
    const dailyRoom = await this.dailyService.createRoom(bookingId, slotEndTime);

    const consultation = this.consultationRepository.create({
      booking_id: bookingId,
      video_room_id: dailyRoom.name,
      room_url: dailyRoom.url,
      started_at: null,
      ended_at: null,
      doctor_notes: null,
    });

    const saved = await this.consultationRepository.save(consultation);
    this.logger.log(`Provisioned Daily.co consultation room ${dailyRoom.name} for booking ${bookingId}`);

    // Schedule 10-minute no-show detection BullMQ job (BE-604)
    try {
      const delayMs = Math.max(
        0,
        slotStartTime.getTime() + 10 * 60 * 1000 - Date.now(),
      );
      await this.noShowQueue.add(
        'check-no-show',
        { bookingId },
        {
          delay: delayMs,
          jobId: `no-show-${bookingId}`,
          removeOnComplete: true,
        },
      );
      this.logger.log(
        `Scheduled No-Show detection job for booking ${bookingId} in ${Math.round(delayMs / 1000)}s`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to schedule no-show detection job: ${err.message}`);
    }

    return saved;
  }

  /**
   * Participant joins the consultation (BE-602).
   * - Stamps started_at when first participant joins.
   * - Stamps presence (doctor_joined_at or patient_joined_at).
   * - Returns Daily meeting token and room URL.
   */
  async joinConsultation(
    bookingId: string,
    role: 'doctor' | 'patient',
    userName?: string,
  ): Promise<{
    consultation: Consultation;
    roomUrl: string;
    token: string;
    startedAt: Date | null;
    isFirstParticipant: boolean;
  }> {
    let consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });

    if (!consultation) {
      consultation = await this.provisionRoom(bookingId);
    }

    const isDoctor = role === 'doctor';
    let isFirst = false;

    // First participant to join starts the official consultation timer
    if (!consultation.started_at) {
      consultation.started_at = new Date();
      isFirst = true;
    }

    if (isDoctor && !consultation.doctor_joined_at) {
      consultation.doctor_joined_at = new Date();
    } else if (!isDoctor && !consultation.patient_joined_at) {
      consultation.patient_joined_at = new Date();
    }

    consultation = await this.consultationRepository.save(consultation);

    // Generate participant meeting token
    const expTime = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2 hours
    const tokenResult = await this.dailyService.createMeetingToken(
      consultation.video_room_id,
      userName || (isDoctor ? 'Consulting Doctor' : 'Patient'),
      isDoctor,
      expTime,
    );

    // Broadcast timer sync if consultation active
    if (consultation.started_at) {
      this.consultationGateway.broadcastTimerSync(
        bookingId,
        consultation.started_at,
        1800, // 30 minutes duration
      );
    }

    return {
      consultation,
      roomUrl: consultation.room_url || `https://${envConfig.DAILY_DOMAIN}.daily.co/${consultation.video_room_id}`,
      token: tokenResult.token,
      startedAt: consultation.started_at,
      isFirstParticipant: isFirst,
    };
  }

  /**
   * Ends consultation (BE-602).
   * - Updates consultation.ended_at
   * - Transitions booking.status to COMPLETED
   * - Enables prescription eligibility
   * - Emits WebSocket broadcast to all room participants
   */
  async endConsultation(
    bookingId: string,
    doctorId: string,
  ): Promise<{
    success: boolean;
    ended_at: Date;
    status: BookingStatus;
    eligible_for_prescription: boolean;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation for booking ${bookingId} not found`);
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const endedAt = new Date();
    consultation.ended_at = endedAt;
    await this.consultationRepository.save(consultation);

    booking.status = BookingStatus.COMPLETED;
    await this.bookingRepository.save(booking);

    // Broadcast consultation ended via WebSocket
    this.consultationGateway.broadcastConsultationEnded(bookingId, endedAt, doctorId);

    this.logger.log(
      `Consultation for booking ${bookingId} concluded by doctor ${doctorId}. Status set to COMPLETED.`,
    );

    return {
      success: true,
      ended_at: endedAt,
      status: BookingStatus.COMPLETED,
      eligible_for_prescription: true,
    };
  }

  /**
   * Securely saves doctor clinical notes to AWS RDS (BE-605).
   */
  async saveDoctorNotes(
    bookingId: string,
    notes: string,
    doctorId?: string,
  ): Promise<{
    success: boolean;
    doctor_notes: string;
    updated_at: Date;
    booking?: any;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation for booking ${bookingId} not found`);
    }

    consultation.doctor_notes = notes;
    const saved = await this.consultationRepository.save(consultation);

    // Notify WebSocket subscribers that notes have been saved
    this.consultationGateway.broadcastNotesSaved(bookingId, saved.updated_at);

    return {
      success: true,
      doctor_notes: saved.doctor_notes || '',
      updated_at: saved.updated_at,
      booking: consultation.booking,
    };
  }

  /**
   * Retrieves full details and context for a consultation session.
   */
  async getConsultationDetails(bookingId: string) {
    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });

    if (!consultation) {
      // Auto-provision if confirmed booking
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
      });
      if (booking && booking.status === BookingStatus.CONFIRMED) {
        return this.provisionRoom(bookingId);
      }
      throw new NotFoundException(`Consultation for booking ${bookingId} not found`);
    }

    // Get doctor profile if available
    let doctorName = 'Doctor';
    let specialty = 'General Practitioner';
    if (consultation.booking?.doctor_id) {
      const doc = await this.doctorProfileRepository.findOne({
        where: { user_id: consultation.booking.doctor_id },
        relations: ['user'],
      });
      if (doc) {
        doctorName = doc.user?.full_name || `Dr. ${doc.hpcsa_number}`;
        specialty = doc.specialty;
      }
    }

    return {
      ...consultation,
      doctor: {
        name: doctorName,
        specialty,
      },
    };
  }

  /**
   * Doctor initiates an in-call consultation time extension (BE-701).
   * - Validates duration (+15, +20, +30 min).
   * - Calculates cost (R150, R200, R300).
   * - Verifies VPS next availability slot is open (rejects with 409 Conflict if booked).
   * - Emits WebSocket 'extension_requested' to patient.
   */
  async requestExtension(
    bookingId: string,
    durationMinutes: number,
    doctorId?: string,
  ): Promise<{
    extension: ConsultationExtension;
    amount: number;
    duration_minutes: number;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation for booking ${bookingId} not found`);
    }

    if (consultation.ended_at) {
      throw new BadRequestException('Cannot extend an ended consultation');
    }

    const validDurations = [15, 20, 30];
    if (!validDurations.includes(durationMinutes)) {
      throw new BadRequestException('Extension duration must be 15, 20, or 30 minutes');
    }

    // Standard platform extension rates: +15 min = R150, +20 min = R200, +30 min = R300
    const rates: Record<number, number> = { 15: 150, 20: 200, 30: 300 };
    const amount = rates[durationMinutes];

    // Check VPS availability: Is doctor's next slot open?
    const booking = consultation.booking;
    if (booking?.slot_id) {
      const currentSlot = await this.slotRepository.findOne({
        where: { id: booking.slot_id },
      });

      if (currentSlot) {
        const slotEnd = new Date(currentSlot.end_time);
        const extensionEnd = new Date(slotEnd.getTime() + durationMinutes * 60 * 1000);

        // Check if next slot is already marked booked
        const nextBookedSlot = await this.slotRepository
          .createQueryBuilder('slot')
          .where('slot.doctor_id = :doctorId', { doctorId: currentSlot.doctor_id })
          .andWhere('slot.start_time >= :slotEnd', { slotEnd })
          .andWhere('slot.start_time < :extensionEnd', { extensionEnd })
          .andWhere('slot.is_booked = :isBooked', { isBooked: true })
          .getOne();

        if (nextBookedSlot) {
          throw new ConflictException('Next slot is booked. Doctor has an upcoming appointment.');
        }

        // Check if any other booking is scheduled for this doctor in this extension window
        const conflictingBooking = await this.bookingRepository
          .createQueryBuilder('b')
          .where('b.doctor_id = :doctorId', { doctorId: booking.doctor_id })
          .andWhere('b.id != :currentBookingId', { currentBookingId: booking.id })
          .andWhere('b.status IN (:...activeStatuses)', {
            activeStatuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
          })
          .getMany();

        for (const otherBooking of conflictingBooking) {
          if (otherBooking.slot_id) {
            const s = await this.slotRepository.findOne({ where: { id: otherBooking.slot_id } });
            if (s) {
              const otherStart = new Date(s.start_time);
              if (otherStart >= slotEnd && otherStart < extensionEnd) {
                throw new ConflictException('Next slot is booked. Doctor has an upcoming appointment.');
              }
            }
          }
        }
      }
    }

    // Create extension record in REQUESTED status
    const extension = this.extensionRepository.create({
      consultation_id: consultation.id,
      duration_minutes: durationMinutes,
      amount,
      status: ExtensionStatus.REQUESTED,
    });
    const savedExtension = await this.extensionRepository.save(extension);

    // Lookup doctor name for patient modal display
    let docName = 'Dr. ChekUp247';
    if (booking?.doctor_id) {
      const docUser = await this.userRepository.findOne({ where: { id: booking.doctor_id } });
      if (docUser?.full_name) {
        docName = `Dr. ${docUser.full_name}`;
      }
    }

    // Broadcast WebSocket event to patient (BE-701, PA-701)
    this.consultationGateway.broadcastExtensionRequested(bookingId, {
      extensionId: savedExtension.id,
      durationMinutes,
      amount,
      doctorName: docName,
    });

    this.logger.log(
      `Time extension requested for booking ${bookingId}: +${durationMinutes}m (R${amount})`,
    );

    return {
      extension: savedExtension,
      amount,
      duration_minutes: durationMinutes,
    };
  }

  /**
   * Patient responds to in-call time extension consent modal (BE-701).
   * - If declined: emits 'extension_declined' to doctor.
   * - If approved: executes Paystack tokenized charge using patient's vaulted card.
   * - On success: extends Daily.co room expiry, broadcasts 'extension_confirmed', updates timers.
   */
  async consentExtension(
    bookingId: string,
    extensionId: string,
    approved: boolean,
    patientId?: string,
  ): Promise<{
    success: boolean;
    approved: boolean;
    status: ExtensionStatus;
    added_minutes?: number;
    remaining_seconds?: number;
    amount?: number;
  }> {
    const extension = await this.extensionRepository.findOne({
      where: { id: extensionId },
      relations: ['consultation', 'consultation.booking'],
    });

    if (!extension) {
      throw new NotFoundException(`Extension with ID ${extensionId} not found`);
    }

    if (extension.status !== ExtensionStatus.REQUESTED) {
      throw new BadRequestException(`Extension is already ${extension.status}`);
    }

    const consultation = extension.consultation;
    const booking = consultation.booking;

    if (!approved) {
      extension.status = ExtensionStatus.DECLINED;
      await this.extensionRepository.save(extension);

      this.consultationGateway.broadcastExtensionDeclined(bookingId, {
        extensionId: extension.id,
        reason: 'Patient declined the consultation extension request.',
      });

      this.logger.log(`Extension ${extensionId} declined by patient for booking ${bookingId}`);

      return {
        success: true,
        approved: false,
        status: ExtensionStatus.DECLINED,
      };
    }

    // Approved: execute auto-debit charge using vaulted Paystack authorization token (BE-701, BE-504)
    extension.status = ExtensionStatus.APPROVED;
    await this.extensionRepository.save(extension);

    // Retrieve saved authorization code from patient's previous payment
    let savedPayment = await this.paymentRepository.findOne({
      where: { booking_id: booking.id, status: PaymentRecordStatus.SUCCESS },
      order: { created_at: 'DESC' },
    });

    if (!savedPayment?.authorization_code) {
      // Check if patient has any previous vaulted card
      const pastPayment = await this.paymentRepository
        .createQueryBuilder('p')
        .innerJoin('p.booking', 'b')
        .where('b.patient_id = :patientId', { patientId: booking.patient_id })
        .andWhere('p.authorization_code IS NOT NULL')
        .andWhere('p.status = :status', { status: PaymentRecordStatus.SUCCESS })
        .orderBy('p.created_at', 'DESC')
        .getOne();

      if (pastPayment) {
        savedPayment = pastPayment;
      }
    }

    const authCode = savedPayment?.authorization_code || 'AUTH_tok_vault_default';
    const patientUser = await this.userRepository.findOne({
      where: { id: booking.patient_id },
    });
    const patientEmail = patientUser?.email || 'patient@chekup247.com';
    const amountInCents = Math.round(Number(extension.amount) * 100);
    const reference = `chk_ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let chargeResult: any;
    try {
      chargeResult = await this.paystackService.chargeAuthorization({
        authorizationCode: authCode,
        email: patientEmail,
        amountInCents,
        reference,
        metadata: {
          booking_id: booking.id,
          extension_id: extension.id,
          duration_minutes: extension.duration_minutes,
        },
      });

      if (chargeResult.status !== 'success') {
        throw new Error(chargeResult.gateway_response || 'Card debit authorization declined');
      }
    } catch (chargeErr: any) {
      this.logger.error(`Paystack tokenized auto-debit failed: ${chargeErr.message}`);
      this.consultationGateway.broadcastExtensionPaymentFailed(bookingId, {
        extensionId: extension.id,
        message: 'Vaulted card charge failed. Extension could not be activated.',
      });
      throw new BadRequestException('Payment debit failed for time extension.');
    }

    // Record successful extension payment
    const payment = this.paymentRepository.create({
      booking_id: booking.id,
      amount: Number(extension.amount),
      provider: 'paystack',
      provider_ref: reference,
      authorization_code: authCode,
      card_type: savedPayment?.card_type || 'visa',
      last4: savedPayment?.last4 || '4081',
      status: PaymentRecordStatus.SUCCESS,
    });
    const savedPaymentRecord = await this.paymentRepository.save(payment);

    // Update extension to PAID
    extension.payment_id = savedPaymentRecord.id;
    extension.status = ExtensionStatus.PAID;
    await this.extensionRepository.save(extension);

    // Extend Daily.co room expiry on Daily API
    await this.dailyService.extendRoomExpiry(
      consultation.video_room_id,
      extension.duration_minutes,
    );

    // Compute updated total duration and remaining seconds
    const allPaid = await this.extensionRepository.find({
      where: { consultation_id: consultation.id, status: ExtensionStatus.PAID },
    });
    const totalExtraMinutes = allPaid.reduce((sum, e) => sum + e.duration_minutes, 0);
    const baseDuration = 1800; // 30 minutes in seconds
    const totalDurationSeconds = baseDuration + totalExtraMinutes * 60;

    const startedTime = consultation.started_at
      ? new Date(consultation.started_at).getTime()
      : Date.now();
    const elapsed = Math.max(0, Math.floor((Date.now() - startedTime) / 1000));
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsed);

    // Broadcast extension confirmed & timer sync to both participants
    this.consultationGateway.broadcastExtensionConfirmed(bookingId, {
      extensionId: extension.id,
      addedMinutes: extension.duration_minutes,
      newDurationSeconds: totalDurationSeconds,
      remainingSeconds,
      amount: Number(extension.amount),
    });

    this.consultationGateway.broadcastTimerSync(
      bookingId,
      new Date(startedTime),
      totalDurationSeconds,
    );

    this.logger.log(
      `Extension ${extensionId} PAID & confirmed for booking ${bookingId}: +${extension.duration_minutes}m (R${extension.amount})`,
    );

    return {
      success: true,
      approved: true,
      status: ExtensionStatus.PAID,
      added_minutes: extension.duration_minutes,
      remaining_seconds: remainingSeconds,
      amount: Number(extension.amount),
    };
  }

  /**
   * Retrieves all extensions for a consultation.
   */
  async getExtensions(bookingId: string): Promise<ConsultationExtension[]> {
    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
    });
    if (!consultation) return [];

    return this.extensionRepository.find({
      where: { consultation_id: consultation.id },
      order: { created_at: 'ASC' },
    });
  }
}
