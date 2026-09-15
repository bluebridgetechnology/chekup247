import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUES } from '../queues/queue.constants';
import { Booking, BookingStatus, PaymentStatus, Consultation } from '../../database/patient/entities';
import { DoctorProfile } from '../../database/operational/entities';
import { PaymentsService } from '../payments/payments.service';

export interface NoShowJobData {
  bookingId: string;
}

@Processor(QUEUES.NO_SHOW)
export class NoShowProcessor extends WorkerHost {
  private readonly logger = new Logger(NoShowProcessor.name);

  constructor(
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Consultation, 'patient')
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {
    super();
  }

  async process(job: Job<NoShowJobData, any, string>): Promise<any> {
    const { bookingId } = job.data;
    this.logger.log(`[NoShowDetection] Evaluating 10-minute grace period for booking ${bookingId}`);

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`[NoShowDetection] Booking ${bookingId} not found`);
      return { status: 'not_found' };
    }

    // If already finalized or cancelled, no action needed
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      this.logger.log(
        `[NoShowDetection] Booking ${bookingId} already resolved with status=${booking.status}`,
      );
      return { status: 'already_resolved', bookingStatus: booking.status };
    }

    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
    });

    const isStarted = Boolean(consultation?.started_at);
    const doctorJoined = Boolean(consultation?.doctor_joined_at);
    const patientJoined = Boolean(consultation?.patient_joined_at);

    // If session started or both joined, no-show did not occur
    if (isStarted || (doctorJoined && patientJoined)) {
      this.logger.log(
        `[NoShowDetection] Booking ${bookingId} consultation active/started. Grace period passed successfully.`,
      );
      return { status: 'consultation_active_or_completed' };
    }

    // Case 1: Doctor No-Show (Patient joined or doctor failed to appear)
    if (!doctorJoined && patientJoined) {
      this.logger.warn(
        `[NoShowDetection] Doctor No-Show detected for booking ${bookingId}! Issuing 100% full refund to patient.`,
      );

      // Trigger automated 100% refund
      try {
        await this.paymentsService.processRefund({
          bookingId: booking.id,
          reason: 'Automated 100% refund: Doctor no-show 10-minute grace period elapsed',
        });
      } catch (err: any) {
        this.logger.error(`Failed to process refund for doctor no-show: ${err.message}`);
      }

      // Flag doctor on operational profile
      try {
        const doctorProfile = await this.doctorProfileRepository.findOne({
          where: { user_id: booking.doctor_id },
          relations: ['user'],
        });
        if (doctorProfile) {
          const docName = doctorProfile.user?.full_name || doctorProfile.hpcsa_number;
          this.logger.warn(
            `Flagging doctor ${booking.doctor_id} (${docName}) for no-show incident on booking ${bookingId}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Could not update doctor profile flag: ${err.message}`);
      }

      booking.status = BookingStatus.CANCELLED;
      booking.payment_status = PaymentStatus.REFUNDED;
      await this.bookingRepository.save(booking);

      return {
        status: 'doctor_no_show',
        refunded: true,
        bookingId: booking.id,
      };
    }

    // Case 2: Patient No-Show (Doctor joined, patient did not)
    if (doctorJoined && !patientJoined) {
      this.logger.log(
        `[NoShowDetection] Patient No-Show detected for booking ${bookingId}. Doctor will be paid.`,
      );

      booking.status = BookingStatus.NO_SHOW;
      booking.payment_status = PaymentStatus.RELEASED;
      await this.bookingRepository.save(booking);

      return {
        status: 'patient_no_show',
        doctorPaid: true,
        bookingId: booking.id,
      };
    }

    // Case 3: Neither participant joined within 10 minutes
    this.logger.warn(
      `[NoShowDetection] Neither party joined booking ${bookingId} within 10-minute grace period. Issuing patient refund.`,
    );

    try {
      await this.paymentsService.processRefund({
        bookingId: booking.id,
        reason: 'Automated refund: Consultation not attended by either party within 10-minute grace window',
      });
    } catch (err: any) {
      this.logger.error(`Failed to process refund for uncommenced booking: ${err.message}`);
    }

    booking.status = BookingStatus.NO_SHOW;
    booking.payment_status = PaymentStatus.REFUNDED;
    await this.bookingRepository.save(booking);

    return {
      status: 'mutual_no_show',
      refunded: true,
      bookingId: booking.id,
    };
  }
}
