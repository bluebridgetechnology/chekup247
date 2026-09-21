import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  DoctorProfile,
  VerificationToken,
  NotificationPreference,
} from '../../database/operational/entities';
import { PatientMedicalProfile } from '../../database/patient/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';
import { LocumStaffSsoService } from './locumstaff-sso.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminLoginRateLimitGuard } from '../../common/guards/admin-login-rate-limit.guard';
import { BrevoEmailProvider } from '../notifications/providers/brevo.provider';
import { SmsProvider } from '../notifications/providers/sms.provider';
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [User, DoctorProfile, VerificationToken, NotificationPreference],
      'operational',
    ),
    TypeOrmModule.forFeature([PatientMedicalProfile], 'patient'),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    TotpService,
    LocumStaffSsoService,
    JwtAuthGuard,
    RolesGuard,
    AdminLoginRateLimitGuard,
    BrevoEmailProvider,
    SmsProvider,
  ],
  exports: [AuthService, TokenService, LocumStaffSsoService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

