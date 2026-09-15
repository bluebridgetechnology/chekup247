import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  Booking,
  BookingStatus,
} from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile } from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import { DailyService } from './daily.service';
import { ConsultationGateway } from './consultation.gateway';

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
    @InjectRepository(AvailabilitySlot, 'operational')
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    private readonly dailyService: DailyService,
    private readonly consultationGateway: ConsultationGateway,
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
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { booking_id: bookingId },
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
}
