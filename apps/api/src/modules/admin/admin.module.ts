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
  Prescription,
} from '../../database/patient/entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [PlatformSetting, AuditLog, DoctorProfile, User, Payout, AvailabilitySlot],
      'operational',
    ),
    TypeOrmModule.forFeature(
      [Booking, Payment, WalletCredit, Consultation, Prescription],
      'patient',
    ),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
