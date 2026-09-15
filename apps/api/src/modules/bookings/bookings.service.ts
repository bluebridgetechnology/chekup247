import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  Payment,
} from '../../database/patient/entities';
import {
  AvailabilitySlot,
  DoctorProfile,
  User,
} from '../../database/operational/entities';
import { PaymentsService } from '../payments/payments.service';
import { QUEUES } from '../queues/queue.constants';

export interface CreateBookingDto {
  slotId: string;
  notes?: string;
}

export interface StitchedBookingResponse extends Booking {
  doctor?: {
    id: string;
    fullName: string;
    email: string;
    specialty: string;
    hpcsaNumber: string;
    ratePerHour: number;
    avatarUrl?: string | null;
    facilityName?: string | null;
    facilityAddress?: string | null;
  };
  patient?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  slot?: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  payment?: Payment | null;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment, 'patient')
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(AvailabilitySlot, 'operational')
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectDataSource('operational')
    private readonly operationalDataSource: DataSource,
    @InjectDataSource('patient')
    private readonly patientDataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    @InjectQueue(QUEUES.BOOKING_DLQ)
    private readonly dlqQueue: Queue,
  ) {}

  /**
   * BE-501: Booking Creation Saga Orchestrator.
   * Atomic slot reservation on VPS Postgres with compensating rollback
   * and DLQ fallback on AWS RDS write failure.
   */
  async createBookingSaga(
    patientId: string,
    dto: CreateBookingDto,
  ): Promise<StitchedBookingResponse> {
    const { slotId } = dto;
    this.logger.log(`Starting Booking Creation Saga for slotId=${slotId}, patientId=${patientId}`);

    // =========================================================================
    // STEP 1: VPS Postgres (Operational DB) — Atomic Slot Lock
    // =========================================================================
    const vpsQueryRunner = this.operationalDataSource.createQueryRunner();
    await vpsQueryRunner.connect();
    await vpsQueryRunner.startTransaction();

    let lockedSlot: AvailabilitySlot | null = null;
    let doctorProfile: DoctorProfile | null = null;

    try {
      // Pessimistic write lock: SELECT ... FOR UPDATE
      lockedSlot = await vpsQueryRunner.manager
        .createQueryBuilder(AvailabilitySlot, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :slotId', { slotId })
        .getOne();

      if (!lockedSlot) {
        throw new NotFoundException(`Availability slot with ID ${slotId} not found`);
      }

      if (lockedSlot.is_booked) {
        throw new ConflictException('This appointment slot has already been booked');
      }

      if (lockedSlot.is_locked) {
        throw new ConflictException('This appointment slot is currently locked');
      }

      // Check slot is in future
      if (new Date(lockedSlot.start_time).getTime() < Date.now()) {
        throw new BadRequestException('Cannot book a slot in the past');
      }

      // Retrieve doctor profile to determine consultation price
      doctorProfile = await vpsQueryRunner.manager.findOne(DoctorProfile, {
        where: { id: lockedSlot.doctor_id },
        relations: ['user'],
      });

      if (!doctorProfile) {
        throw new NotFoundException('Doctor profile associated with this slot was not found');
      }

      // Mark slot as booked on VPS
      lockedSlot.is_booked = true;
      await vpsQueryRunner.manager.save(lockedSlot);

      // Commit Step 1 on VPS Postgres
      await vpsQueryRunner.commitTransaction();
      this.logger.log(`Step 1 Success: Slot ${slotId} locked and committed on VPS Postgres`);
    } catch (err: any) {
      await vpsQueryRunner.rollbackTransaction();
      this.logger.warn(`Step 1 Aborted: ${err.message}`);
      throw err;
    } finally {
      await vpsQueryRunner.release();
    }

    // =========================================================================
    // STEP 2: AWS RDS (Patient DB) — Insert Booking Record
    // =========================================================================
    const price = Number(doctorProfile.rate_per_hour) || 850.0;
    const commissionAmount = Math.round(price * 0.15 * 100) / 100; // 15% platform commission

    let createdBooking: Booking;

    try {
      const newBooking = this.bookingRepository.create({
        patient_id: patientId,
        doctor_id: lockedSlot.doctor_id,
        slot_id: lockedSlot.id,
        status: BookingStatus.PENDING,
        price,
        commission_amount: commissionAmount,
        payment_status: PaymentStatus.UNPAID,
      });

      createdBooking = await this.bookingRepository.save(newBooking);
      this.logger.log(`Step 2 Success: Booking ${createdBooking.id} created on AWS RDS`);
    } catch (rdsError: any) {
      this.logger.error(
        `Step 2 Failed writing to AWS RDS: ${rdsError.message}. Initiating compensating rollback on VPS Postgres.`,
      );

      // =======================================================================
      // COMPENSATING ROLLBACK: Revert slot is_booked on VPS Postgres
      // =======================================================================
      try {
        await this.slotRepository.update(
          { id: lockedSlot.id },
          { is_booked: false },
        );
        this.logger.log(`Compensating Rollback Success: Slot ${lockedSlot.id} released on VPS Postgres`);
      } catch (compensateError: any) {
        // Step 1 rollback failed! Push to Dead-Letter Queue (DLQ) for Reconciliation Cron
        this.logger.error(
          `CRITICAL: Compensating rollback failed on VPS! Pushing slot ${lockedSlot.id} to DLQ: ${compensateError.message}`,
        );

        try {
          await this.dlqQueue.add(
            'booking-compensation-failed',
            {
              slotId: lockedSlot.id,
              doctorId: lockedSlot.doctor_id,
              patientId,
              timestamp: new Date().toISOString(),
              action: 'release_slot',
              error: compensateError.message,
            },
            { attempts: 5, backoff: 5000 },
          );
        } catch (dlqError: any) {
          this.logger.error(`Failed to push to DLQ queue: ${dlqError.message}`);
        }
      }

      throw new InternalServerErrorException(
        'Unable to complete booking reservation. All database modifications have been safely compensated.',
      );
    }

    // Return stitched response
    return this.stitchBooking(createdBooking, doctorProfile, lockedSlot);
  }

  /**
   * BE-506: Cross-Database Booking Queries — Mine (Patient).
   * Stitches RDS bookings with VPS DoctorProfile, User, and AvailabilitySlot data.
   */
  async getPatientBookings(patientId: string): Promise<StitchedBookingResponse[]> {
    const bookings = await this.bookingRepository.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
    });

    if (bookings.length === 0) return [];
    return this.enrichBookings(bookings);
  }

  /**
   * BE-506: Cross-Database Booking Queries — Doctor.
   * Stitches RDS bookings with Patient User and AvailabilitySlot data.
   */
  async getDoctorBookings(doctorId: string): Promise<StitchedBookingResponse[]> {
    const bookings = await this.bookingRepository.find({
      where: { doctor_id: doctorId },
      order: { created_at: 'DESC' },
    });

    if (bookings.length === 0) return [];
    return this.enrichBookings(bookings);
  }

  /**
   * BE-506: Cross-Database Booking Queries — Single Booking Details.
   */
  async getBookingById(id: string, requesterUserId?: string): Promise<StitchedBookingResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const enrichedList = await this.enrichBookings([booking]);
    const enriched = enrichedList[0];

    // Fetch payments if any
    const payment = await this.paymentRepository.findOne({
      where: { booking_id: id },
      order: { created_at: 'DESC' },
    });
    enriched.payment = payment || null;

    return enriched;
  }

  /**
   * Cancel booking with automatic refund processing & slot unlock (BE-507).
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason: string = 'Patient cancelled appointment',
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Check authorization: must be patient, or doctor of the booking
    const isPatient = booking.patient_id === userId;
    const isDoctor = booking.doctor_id === userId;

    if (!isPatient && !isDoctor) {
      // Check if user is the doctor via doctor profile
      const doctorProfile = await this.doctorRepository.findOne({
        where: { user_id: userId },
      });
      if (!doctorProfile || doctorProfile.id !== booking.doctor_id) {
        throw new ForbiddenException('You are not authorized to cancel this booking');
      }
    }

    // 1. Process refund if payment was held/completed
    let refundResult = null;
    if (booking.payment_status === PaymentStatus.HELD) {
      refundResult = await this.paymentsService.processRefund({
        bookingId: booking.id,
        reason,
        refundToWallet: true, // Default to wallet credit for instant patient benefit
      });
    }

    // 2. Mark booking as cancelled
    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepository.save(booking);

    // 3. Unlock availability slot on VPS Postgres
    await this.slotRepository.update(
      { id: booking.slot_id },
      { is_booked: false },
    );
    this.logger.log(`Booking ${bookingId} cancelled and slot ${booking.slot_id} unlocked`);

    return {
      success: true,
      booking_id: booking.id,
      status: booking.status,
      refund: refundResult,
      message: 'Booking cancelled successfully and slot reopened.',
    };
  }

  /**
   * BE-508: Cross-DB Reconciliation Cron Job.
   * Scans for orphaned `is_booked = true` slots lacking active bookings,
   * cancels expired pending bookings, and drains DLQ items.
   */
  async reconcileDatabaseDrift() {
    this.logger.log('Starting cross-database reconciliation audit...');
    let orphanedSlotsFixed = 0;
    let expiredPendingFixed = 0;
    let dlqProcessed = 0;

    // 1. Scan VPS slots marked booked
    const bookedSlots = await this.slotRepository.find({
      where: { is_booked: true },
    });

    if (bookedSlots.length > 0) {
      const slotIds = bookedSlots.map((s) => s.id);
      const activeBookings = await this.bookingRepository.find({
        where: { slot_id: In(slotIds) },
      });

      const slotBookingMap = new Map<string, Booking>();
      for (const b of activeBookings) {
        slotBookingMap.set(b.slot_id, b);
      }

      const now = Date.now();
      const thirtyMinutesAgo = now - 30 * 60 * 1000;

      for (const slot of bookedSlots) {
        const booking = slotBookingMap.get(slot.id);

        if (!booking) {
          // Orphaned slot with no booking in RDS!
          this.logger.warn(`[Reconciliation] Orphaned slot detected: id=${slot.id}. Releasing slot.`);
          slot.is_booked = false;
          await this.slotRepository.save(slot);
          orphanedSlotsFixed++;
        } else if (
          booking.status === BookingStatus.PENDING &&
          booking.payment_status === PaymentStatus.UNPAID &&
          new Date(booking.created_at).getTime() < thirtyMinutesAgo
        ) {
          // Expired pending booking older than 30 mins without payment!
          this.logger.warn(
            `[Reconciliation] Expired pending booking detected: id=${booking.id}, slotId=${slot.id}. Cancelling.`,
          );
          booking.status = BookingStatus.CANCELLED;
          await this.bookingRepository.save(booking);

          slot.is_booked = false;
          await this.slotRepository.save(slot);
          expiredPendingFixed++;
        } else if (booking.status === BookingStatus.CANCELLED) {
          // Slot still marked booked even though booking is cancelled
          this.logger.warn(`[Reconciliation] Slot ${slot.id} marked booked for cancelled booking ${booking.id}. Fixing.`);
          slot.is_booked = false;
          await this.slotRepository.save(slot);
          orphanedSlotsFixed++;
        }
      }
    }

    // 2. Process DLQ Queue Jobs
    try {
      const waitingJobs = await this.dlqQueue.getWaiting();
      for (const job of waitingJobs) {
        if (job.data?.action === 'release_slot' && job.data?.slotId) {
          await this.slotRepository.update({ id: job.data.slotId }, { is_booked: false });
          await job.remove();
          dlqProcessed++;
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not drain DLQ queue during reconciliation: ${e.message}`);
    }

    this.logger.log(
      `Reconciliation complete: ${orphanedSlotsFixed} orphaned slots fixed, ${expiredPendingFixed} expired pending bookings fixed, ${dlqProcessed} DLQ entries processed.`,
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      orphaned_slots_fixed: orphanedSlotsFixed,
      expired_pending_fixed: expiredPendingFixed,
      dlq_processed: dlqProcessed,
    };
  }

  // =========================================================================
  // Private Helper Stitching Methods
  // =========================================================================

  private async enrichBookings(bookings: Booking[]): Promise<StitchedBookingResponse[]> {
    const doctorIds = [...new Set(bookings.map((b) => b.doctor_id))];
    const patientIds = [...new Set(bookings.map((b) => b.patient_id))];
    const slotIds = [...new Set(bookings.map((b) => b.slot_id))];

    // Fetch doctors from operational DB
    const doctors = doctorIds.length > 0
      ? await this.doctorRepository.find({
          where: { id: In(doctorIds) },
          relations: ['user'],
        })
      : [];
    const doctorMap = new Map<string, DoctorProfile>();
    doctors.forEach((d) => doctorMap.set(d.id, d));

    // Fetch patient users from operational DB
    const patients = patientIds.length > 0
      ? await this.userRepository.find({
          where: { id: In(patientIds) },
        })
      : [];
    const patientMap = new Map<string, User>();
    patients.forEach((p) => patientMap.set(p.id, p));

    // Fetch slots from operational DB
    const slots = slotIds.length > 0
      ? await this.slotRepository.find({
          where: { id: In(slotIds) },
        })
      : [];
    const slotMap = new Map<string, AvailabilitySlot>();
    slots.forEach((s) => slotMap.set(s.id, s));

    return bookings.map((booking) => {
      const doc = doctorMap.get(booking.doctor_id);
      const pat = patientMap.get(booking.patient_id);
      const slt = slotMap.get(booking.slot_id);

      return this.stitchBooking(booking, doc, slt, pat);
    });
  }

  private stitchBooking(
    booking: Booking,
    doc?: DoctorProfile | null,
    slot?: AvailabilitySlot | null,
    patient?: User | null,
  ): StitchedBookingResponse {
    const response: StitchedBookingResponse = {
      ...booking,
    };

    if (doc) {
      response.doctor = {
        id: doc.id,
        fullName: doc.user?.full_name || 'Dr. Practitioner',
        email: doc.user?.email || '',
        specialty: doc.specialty,
        hpcsaNumber: doc.hpcsa_number,
        ratePerHour: Number(doc.rate_per_hour),
        avatarUrl: doc.user?.avatar_url || null,
        facilityName: doc.facility_name || null,
        facilityAddress: doc.facility_address || null,
      };
    }

    if (patient) {
      response.patient = {
        id: patient.id,
        fullName: patient.full_name,
        email: patient.email,
        phone: patient.phone,
      };
    }

    if (slot) {
      response.slot = {
        id: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
      };
    }

    return response;
  }
}
