import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { envConfig } from '../../config/env.config';
import { QUEUES } from './queue.constants';
import { QueueWorkerProcessor } from './queue-worker.processor';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Review } from '../../database/patient/entities';
import { DoctorProfile } from '../../database/operational/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReminderScheduler } from './reminder.scheduler';
import { ReminderProcessor } from './reminder.processor';
import { RatingSyncProcessor } from './rating-sync.processor';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Review], 'patient'),
    TypeOrmModule.forFeature([DoctorProfile], 'operational'),
    NotificationsModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: envConfig.REDIS_HOST,
          port: envConfig.REDIS_PORT,
          password: envConfig.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.REMINDERS },
      { name: QUEUES.DIRECTORY_SYNC },
      { name: QUEUES.AVAILABILITY_SYNC },
      { name: QUEUES.PAYOUT },
      { name: QUEUES.RATING_SYNC },
      { name: QUEUES.NO_SHOW },
      { name: QUEUES.BOOKING_DLQ },
      { name: QUEUES.RECONCILIATION },
    ),
  ],
  providers: [QueueWorkerProcessor, ReminderScheduler, ReminderProcessor, RatingSyncProcessor],
  exports: [BullModule, ReminderScheduler],
})
export class QueuesModule {}
