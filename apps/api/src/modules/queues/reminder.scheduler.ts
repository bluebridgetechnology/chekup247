import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.constants';

export interface ScheduleReminderParams {
  bookingId: string;
  patientId: string;
  doctorId: string;
  slotStartTime: Date | string;
  patientName?: string;
  doctorName?: string;
}

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    @InjectQueue(QUEUES.REMINDERS)
    private readonly remindersQueue: Queue,
  ) {}

  /**
   * Schedules delayed reminder jobs at T-24h, T-1h, and T-15m.
   */
  async scheduleBookingReminders(params: ScheduleReminderParams): Promise<{
    scheduledWindows: string[];
  }> {
    const { bookingId, slotStartTime } = params;
    const startMs = new Date(slotStartTime).getTime();
    const nowMs = Date.now();
    const scheduledWindows: string[] = [];

    const reminderWindows = [
      { name: '24h', offsetMs: 24 * 60 * 60 * 1000 },
      { name: '1h', offsetMs: 60 * 60 * 1000 },
      { name: '15m', offsetMs: 15 * 60 * 1000 },
    ];

    for (const win of reminderWindows) {
      const targetTimeMs = startMs - win.offsetMs;
      const delayMs = targetTimeMs - nowMs;

      if (delayMs > 0) {
        const jobId = `reminder_${bookingId}_${win.name}`;

        // Ensure no duplicate job exists
        try {
          const existing = await this.remindersQueue.getJob(jobId);
          if (existing) {
            await existing.remove();
          }
        } catch (_) {}

        await this.remindersQueue.add(
          `appointment_reminder_${win.name}`,
          {
            bookingId,
            window: win.name,
            patientId: params.patientId,
            doctorId: params.doctorId,
            slotStartTime,
            patientName: params.patientName,
            doctorName: params.doctorName,
          },
          {
            delay: delayMs,
            jobId,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        scheduledWindows.push(win.name);
        this.logger.log(
          `Scheduled reminder T-${win.name} for booking ${bookingId} in ${Math.round(delayMs / 60000)} minutes`,
        );
      }
    }

    return { scheduledWindows };
  }

  /**
   * Cancels all scheduled reminder jobs for a cancelled or rescheduled booking.
   */
  async cancelBookingReminders(bookingId: string): Promise<{ cancelledCount: number }> {
    const windows = ['24h', '1h', '15m'];
    let cancelledCount = 0;

    for (const win of windows) {
      const jobId = `reminder_${bookingId}_${win}`;
      try {
        const job = await this.remindersQueue.getJob(jobId);
        if (job) {
          await job.remove();
          cancelledCount++;
          this.logger.log(`Cancelled delayed reminder job ${jobId}`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not remove reminder job ${jobId}: ${err.message}`);
      }
    }

    return { cancelledCount };
  }
}
