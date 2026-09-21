import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PlatformSetting,
  AuditLog,
  DoctorProfile,
  User,
  Payout,
  AvailabilitySlot,
} from '../../database/operational/entities';
import {
  Booking,
  Payment,
  WalletCredit,
  Consultation,
  ConsultationExtension,
  Prescription,
  Dispute,
  Review,
  Notification,
} from '../../database/patient/entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSubRolesGuard } from '../../common/guards/admin-sub-roles.guard';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [PlatformSetting, AuditLog, DoctorProfile, User, Payout, AvailabilitySlot],
      'operational',
    ),
    TypeOrmModule.forFeature(
      [Booking, Payment, WalletCredit, Consultation, ConsultationExtension, Prescription, Dispute, Review, Notification],
      'patient',
    ),
    AuthModule,
    NotificationsModule,
    ReviewsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminSubRolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
