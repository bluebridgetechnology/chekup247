import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUES } from './queue.constants';
import { Booking, BookingStatus } from '../../database/patient/entities';
import { NotificationsService } from '../notifications/notifications.service';

@Processor(QUEUES.REMINDERS)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { bookingId, window, patientId, slotStartTime, doctorName } = job.data;
    this.logger.log(`Processing delayed reminder job ${job.id} for booking ${bookingId} (${window})`);

    // Verify booking is still active/confirmed
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found, skipping reminder`);
      return { skipped: true, reason: 'booking_not_found' };
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      this.logger.log(`Booking ${bookingId} is in status ${booking.status}, skipping reminder`);
      return { skipped: true, reason: `booking_status_${booking.status}` };
    }

    const formattedDate = new Date(slotStartTime).toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = new Date(slotStartTime).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const windowText = window === '24h' ? '24 hours' : window === '1h' ? '1 hour' : '15 minutes';

    // Dispatch notification to patient across preferred channels
    await this.notificationsService.dispatchNotification({
      recipientId: patientId,
      title: `Consultation in ${windowText}`,
      templateId: `appointment_reminder_${window}`,
      payload: {
        bookingId,
        window,
        doctorName: doctorName || 'Doctor',
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
        message: `Your telehealth consultation with Dr. ${doctorName || 'Doctor'} starts in ${windowText} at ${formattedTime}.`,
      },
      deepLink: `/consultation/${bookingId}`,
    });

    return { success: true, bookingId, window };
  }
}
