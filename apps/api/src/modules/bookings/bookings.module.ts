import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Booking, Payment } from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User, PlatformSetting } from '../../database/operational/entities';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { QUEUES } from '../queues/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment], 'patient'),
    TypeOrmModule.forFeature([AvailabilitySlot, DoctorProfile, User, PlatformSetting], 'operational'),
    BullModule.registerQueue({ name: QUEUES.BOOKING_DLQ }),
    PaymentsModule,
    NotificationsModule,
    AuthModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
