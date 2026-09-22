import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
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
  Prescription,
  PatientMedicalProfile,
  PatientDocument,
} from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User } from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import { DailyService } from './daily.service';
import { ConsultationGateway } from './consultation.gateway';
import { PaystackService } from '../payments/paystack.service';
import { PatientDemoSeederService } from './patient-demo-seeder.service';

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
    @Optional()
    @InjectRepository(Prescription, 'patient')
    private readonly prescriptionRepository?: Repository<Prescription>,
    @Optional()
    @InjectRepository(PatientMedicalProfile, 'patient')
    private readonly patientMedicalProfileRepository?: Repository<PatientMedicalProfile>,
    @Optional()
    @InjectRepository(PatientDocument, 'patient')
    private readonly patientDocumentRepository?: Repository<PatientDocument>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    private readonly patientDemoSeederService?: PatientDemoSeederService,
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
      if (this.notificationsService && consultation.booking?.patient_id && !consultation.patient_joined_at) {
        this.notificationsService
          .dispatchNotification({
            recipientId: consultation.booking.patient_id,
            title: `Dr. ${userName || 'Your Doctor'} has joined the room`,
            templateId: 'doctor_joined_room',
            payload: {
              bookingId,
              doctorName: userName || 'Doctor',
              message: `Dr. ${userName || 'Your Doctor'} has entered your video consultation room. Please join immediately.`,
            },
            deepLink: `/consultations/${bookingId}`,
          })
          .catch((err) => {
            this.logger.warn(`Could not dispatch doctor_joined_room: ${err.message}`);
          });
      }
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

    if (this.notificationsService) {
      this.userRepository
        .findOne({ where: { id: doctorId } })
        .then((docUser) => {
          const doctorName = docUser?.full_name || 'Practitioner';

          // 1. Dispatch review_request to patient
          this.notificationsService
            ?.dispatchNotification({
              recipientId: booking.patient_id,
              title: 'How was your consultation?',
              templateId: 'review_request',
              payload: {
                bookingId: booking.id,
                doctorName,
                message: `Thank you for consulting with Dr. ${doctorName}. How was your experience?`,
              },
              deepLink: `/reviews/new?bookingId=${booking.id}`,
            })
            .catch(() => {});

          // 2. Dispatch doctor_earnings_credited to doctor
          const netAmount = (
            Number(booking.price || 0) - Number(booking.commission_amount || 0)
          ).toFixed(2);

          this.notificationsService
            ?.dispatchNotification({
              recipientId: doctorId,
              title: 'Consultation Earnings Credited',
              templateId: 'doctor_earnings_credited',
              payload: {
                bookingId: booking.id,
                doctorName,
                amount: netAmount,
                message: `R${netAmount} net earnings credited to your wallet for consultation #${booking.id}.`,
              },
              deepLink: `/doctor/wallet`,
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

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
    patient_notes?: string;
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

    // Save patient-facing notes if provided explicitly or in JSON patientInstructions
    try {
      const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
      if (parsed?.patientInstructions || parsed?.patientNotes) {
        consultation.patient_notes = parsed.patientInstructions || parsed.patientNotes;
      }
    } catch {
      // Plain text doctor notes - leave patient_notes untouched unless updated
    }

    const saved = await this.consultationRepository.save(consultation);

    // Notify WebSocket subscribers that notes have been saved
    this.consultationGateway.broadcastNotesSaved(bookingId, saved.updated_at);

    return {
      success: true,
      doctor_notes: saved.doctor_notes || '',
      patient_notes: saved.patient_notes || '',
      updated_at: saved.updated_at,
      booking: consultation.booking,
    };
  }

  /**
   * Retrieves full details and context for a consultation session.
   */
  async getConsultationDetails(bookingId: string) {
    let consultation = await this.consultationRepository.findOne({
      where: [{ booking_id: bookingId }, { id: bookingId }],
      relations: ['booking'],
    });

    if (!consultation) {
      // Auto-provision if booking exists
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
      });
      if (booking) {
        await this.provisionRoom(booking.id);
        consultation = await this.consultationRepository.findOne({
          where: { booking_id: booking.id },
          relations: ['booking'],
        });
      }
      if (!consultation) {
        throw new NotFoundException(`Consultation for booking ${bookingId} not found`);
      }
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

    // Load patient details, medical profile & uploaded documents for the doctor
    let patientMedicalProfile: PatientMedicalProfile | null = null;
    let patientDocuments: PatientDocument[] = [];
    let patientUser: any = null;

    if (consultation.booking?.patient_id) {
      const pId = consultation.booking.patient_id;
      if (this.patientMedicalProfileRepository) {
        patientMedicalProfile = await this.patientMedicalProfileRepository.findOne({
          where: { patient_id: pId },
        });
      }
      if (this.patientDocumentRepository) {
        patientDocuments = await this.patientDocumentRepository.find({
          where: { patient_id: pId },
          order: { created_at: 'DESC' },
        });
      }
      const u = await this.userRepository.findOne({ where: { id: pId } });
      if (u) {
        patientUser = {
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          phone: u.phone,
          dateOfBirth: u.date_of_birth,
        };
      }
    }

    return {
      ...consultation,
      doctor: {
        name: doctorName,
        specialty,
      },
      patient: patientUser,
      patientMedicalProfile,
      patientDocuments,
    };
  }

  /**
   * Retrieves Health Notes for patient, linking to associated prescription if issued.
   */
  async getPatientHealthNotes(patientId: string) {
    const bookings = await this.bookingRepository.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
    });

    if (!bookings.length) return [];

    const bookingMap = new Map(bookings.map((b) => [b.id, b]));
    const bookingIds = bookings.map((b) => b.id);

    const consultations = await this.consultationRepository.find({
      where: bookingIds.map((bId) => ({ booking_id: bId })),
      order: { created_at: 'DESC' },
    });

    const results = [];
    for (const cons of consultations) {
      const b = bookingMap.get(cons.booking_id);
      if (!b) continue;

      let doctorName = 'Attending Practitioner';
      let specialty = 'General Medicine';
      let avatarUrl: string | null = null;

      if (b.doctor_id) {
        const doc = await this.doctorProfileRepository.findOne({
          where: [{ user_id: b.doctor_id }, { id: b.doctor_id }],
          relations: ['user'],
        });
        if (doc) {
          doctorName = doc.user?.full_name || `Dr. ${doc.hpcsa_number}`;
          specialty = doc.specialty;
          avatarUrl = doc.user?.avatar_url || null;
        }
      }

      // Check for associated prescription for this consultation
      let prescription = null;
      if (this.prescriptionRepository) {
        const presc = await this.prescriptionRepository.findOne({
          where: { consultation_id: cons.id },
        });
        if (presc) {
          prescription = {
            id: presc.id,
            icd10_code: presc.icd10_code,
            schedule_flag: presc.schedule_flag,
            issued_at: presc.issued_at,
            medications_count: Array.isArray(presc.medications) ? presc.medications.length : 0,
            medications: presc.medications,
            pdf_url: presc.pdf_url,
          };
        }
      }

      // Determine patient-facing note (never expose private doctor clinical notes)
      let notes = cons.patient_notes;
      let diagnosis = '';
      if (cons.doctor_notes) {
        try {
          const parsed = JSON.parse(cons.doctor_notes);
          if (parsed.patientInstructions && !notes) {
            notes = parsed.patientInstructions;
          }
          if (parsed.assessment) {
            diagnosis = parsed.assessment;
          }
        } catch {
          // Keep doctor clinical notes hidden
        }
      }

      results.push({
        id: cons.id,
        booking_id: cons.booking_id,
        doctor: {
          name: doctorName,
          specialty,
          avatarUrl,
        },
        date: cons.started_at || b.created_at,
        notes: notes || 'General post-consultation health advice and lifestyle guidance.',
        diagnosis: diagnosis || prescription?.icd10_code || 'General Consultation',
        hasCustomNotes: !!notes,
        prescription,
        created_at: cons.created_at,
      });
    }

    return results;
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
    isFree: boolean = false,
  ): Promise<{
    extension: ConsultationExtension;
    amount: number;
    duration_minutes: number;
    is_free: boolean;
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

    const validDurations = [10, 20, 30];
    if (!validDurations.includes(durationMinutes)) {
      throw new BadRequestException('Extension duration must be 10, 20, or 30 minutes');
    }

    const booking = consultation.booking;

    // Pro-rata pricing: derived from the attending doctor's own published hourly rate
    // (doctor_profiles.rate_per_hour on the operational DB), never sent by the client.
    // amount = rate_per_hour * (minutes / 60), rounded to 2 decimals.
    let amount = 0;
    if (!isFree) {
      const doctorProfile = booking?.doctor_id
        ? await this.doctorProfileRepository.findOne({ where: { user_id: booking.doctor_id } })
        : null;
      const hourlyRate = Number(doctorProfile?.rate_per_hour ?? 0);
      if (hourlyRate <= 0) {
        throw new BadRequestException(
          'This doctor has not set an hourly rate, so a paid extension cannot be priced. Please set your rate in your profile.',
        );
      }
      amount = Math.round(hourlyRate * (durationMinutes / 60) * 100) / 100;
    }

    // Check VPS availability: Is doctor's next slot open?
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
      isFree,
      doctorName: docName,
    });

    this.logger.log(
      `Time extension requested for booking ${bookingId}: +${durationMinutes}m (${isFree ? 'FREE' : 'R' + amount})`,
    );

    return {
      extension: savedExtension,
      amount,
      duration_minutes: durationMinutes,
      is_free: isFree,
    };
  }

  /**
   * Patient responds to in-call time extension consent modal (BE-701).
   *
   * NO stored banking info / NO auto-debit. Every paid extension is a fresh
   * redirect to the Paystack gateway:
   * - If declined: emits 'extension_declined' to the doctor, ends here.
   * - If approved & amount > 0: creates a PENDING payment row (provider_ref
   *   `chk_ext_<extensionId>`), initializes a Paystack checkout and returns the
   *   `authorization_url` for the client to open in a new tab. The consultation
   *   call is NOT touched here — the room is only extended once Paystack confirms
   *   the charge via the webhook (see finalizeExtensionPayment).
   * - If approved & amount == 0 (complimentary): finalizes immediately.
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
    // Present when a redirect payment is required:
    requires_payment?: boolean;
    authorization_url?: string;
    reference?: string;
    amount?: number;
    // Present when finalized inline (complimentary):
    added_minutes?: number;
    remaining_seconds?: number;
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

    // Approved.
    extension.status = ExtensionStatus.APPROVED;
    await this.extensionRepository.save(extension);

    const amount = Number(extension.amount);

    // Complimentary extension (amount 0) — no payment gateway needed, finalize now.
    if (amount <= 0) {
      this.logger.log(`Complimentary extension (Free) approved for booking ${bookingId}`);
      const result = await this.finalizeExtensionPayment(extension.id, null);
      return {
        success: true,
        approved: true,
        status: ExtensionStatus.PAID,
        added_minutes: result.added_minutes,
        remaining_seconds: result.remaining_seconds,
        amount: 0,
      };
    }

    // Paid extension — redirect to the payment gateway. A deterministic, unique
    // reference keyed to the extension id keeps the webhook idempotent.
    const reference = `chk_ext_${extension.id}`;

    // Reuse an existing pending payment row if this consent is retried, otherwise create one.
    let payment = await this.paymentRepository.findOne({ where: { provider_ref: reference } });
    if (!payment) {
      payment = this.paymentRepository.create({
        booking_id: booking.id,
        amount,
        provider: 'paystack',
        provider_ref: reference,
        status: PaymentRecordStatus.PENDING,
      });
      payment = await this.paymentRepository.save(payment);
    }

    // Link the (pending) payment to the extension so the webhook can find its way back.
    extension.payment_id = payment.id;
    await this.extensionRepository.save(extension);

    const patientUser = await this.userRepository.findOne({
      where: { id: patientId || booking.patient_id },
    });
    const patientEmail = patientUser?.email;
    if (!patientEmail) {
      throw new BadRequestException('Patient user account with valid email is required for payment');
    }
    const amountInCents = Math.round(amount * 100);

    const callbackUrl =
      `${envConfig.PATIENT_WEB_URL}/consultations/extend/return` +
      `?bookingId=${bookingId}&reference=${reference}`;

    const init = await this.paystackService.initializeTransaction({
      email: patientEmail,
      amountInCents,
      reference,
      callbackUrl,
      metadata: {
        type: 'consultation_extension',
        booking_id: booking.id,
        extension_id: extension.id,
        duration_minutes: extension.duration_minutes,
      },
    });

    this.logger.log(
      `Extension ${extensionId} approved for booking ${bookingId}: awaiting redirect payment (R${amount}, ref=${reference})`,
    );

    return {
      success: true,
      approved: true,
      status: ExtensionStatus.APPROVED,
      requires_payment: true,
      authorization_url: init.authorization_url,
      reference,
      amount,
    };
  }

  /**
   * Finalizes a consultation time extension once its payment is confirmed
   * (called by the Paystack webhook on charge.success for a `chk_ext_*` reference,
   * or inline for a complimentary/zero-amount extension).
   *
   * This is the ONLY place a paid extension flips to PAID and the Daily.co room
   * is actually extended — so the call is never extended before money is confirmed.
   * Idempotent: a second call for an already-PAID extension is a no-op.
   */
  async finalizeExtensionPayment(
    extensionId: string,
    paymentId: string | null,
  ): Promise<{ added_minutes: number; remaining_seconds: number; already_finalized: boolean }> {
    const extension = await this.extensionRepository.findOne({
      where: { id: extensionId },
      relations: ['consultation', 'consultation.booking'],
    });

    if (!extension) {
      throw new NotFoundException(`Extension with ID ${extensionId} not found`);
    }

    const consultation = extension.consultation;
    const bookingId = consultation.booking_id;

    // Idempotency guard — webhook retries or a double redirect must not double-extend.
    if (extension.status === ExtensionStatus.PAID) {
      const totalDurationSeconds = await this.computeExtendedDurationSeconds(consultation.id);
      const remainingSeconds = this.computeRemainingSeconds(consultation.started_at, totalDurationSeconds);
      return {
        added_minutes: extension.duration_minutes,
        remaining_seconds: remainingSeconds,
        already_finalized: true,
      };
    }

    if (paymentId) {
      extension.payment_id = paymentId;
    }
    extension.status = ExtensionStatus.PAID;
    await this.extensionRepository.save(extension);

    // Extend the live Daily.co room — this is what keeps the call going without disconnect.
    await this.dailyService.extendRoomExpiry(
      consultation.video_room_id,
      extension.duration_minutes,
    );

    const totalDurationSeconds = await this.computeExtendedDurationSeconds(consultation.id);
    const remainingSeconds = this.computeRemainingSeconds(consultation.started_at, totalDurationSeconds);

    // Broadcast the timer bump to BOTH participants in the still-open call.
    this.consultationGateway.broadcastExtensionConfirmed(bookingId, {
      extensionId: extension.id,
      addedMinutes: extension.duration_minutes,
      newDurationSeconds: totalDurationSeconds,
      remainingSeconds,
      amount: Number(extension.amount),
    });

    const startedTime = consultation.started_at
      ? new Date(consultation.started_at)
      : new Date();
    this.consultationGateway.broadcastTimerSync(bookingId, startedTime, totalDurationSeconds);

    this.logger.log(
      `Extension ${extensionId} PAID & confirmed for booking ${bookingId}: +${extension.duration_minutes}m (R${extension.amount})`,
    );

    return {
      added_minutes: extension.duration_minutes,
      remaining_seconds: remainingSeconds,
      already_finalized: false,
    };
  }

  /**
   * Total consultation duration in seconds = base 30 min + all PAID extensions.
   */
  private async computeExtendedDurationSeconds(consultationId: string): Promise<number> {
    const allPaid = await this.extensionRepository.find({
      where: { consultation_id: consultationId, status: ExtensionStatus.PAID },
    });
    const totalExtraMinutes = allPaid.reduce((sum, e) => sum + e.duration_minutes, 0);
    const baseDuration = 1800; // 30 minutes in seconds
    return baseDuration + totalExtraMinutes * 60;
  }

  private computeRemainingSeconds(startedAt: Date | null | undefined, totalDurationSeconds: number): number {
    const startedTime = startedAt ? new Date(startedAt).getTime() : Date.now();
    const elapsed = Math.max(0, Math.floor((Date.now() - startedTime) / 1000));
    return Math.max(0, totalDurationSeconds - elapsed);
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

  /**
   * Handles incoming Daily.co Webhook events (e.g. participant.joined, participant.left).
   * Daily sends a test ping { test: "test" } during webhook creation.
   */
  async handleDailyWebhook(payload: any): Promise<{ received: boolean; status?: string }> {
    if (payload?.test === 'test') {
      this.logger.log('[DailyWebhook] Verification test payload received successfully');
      return { received: true, status: 'verified' };
    }

    const eventType = payload?.type;
    const eventPayload = payload?.payload;
    this.logger.log(`[DailyWebhook] Received event: ${eventType} for room: ${eventPayload?.room_name}`);

    if (eventType === 'participant.joined') {
      const roomName = eventPayload?.room_name;
      if (roomName) {
        const consultation = await this.consultationRepository.findOne({
          where: { video_room_id: roomName },
        });
        if (consultation && !consultation.started_at) {
          consultation.started_at = new Date();
          await this.consultationRepository.save(consultation);
          this.logger.log(`[DailyWebhook] Marked consultation for room ${roomName} as started`);
        }
      }
    }

    return { received: true, status: eventType || 'processed' };
  }
}
