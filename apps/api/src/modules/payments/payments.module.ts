import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Booking, WalletCredit } from '../../database/patient/entities';
import { User, AvailabilitySlot, DoctorProfile, PlatformSetting } from '../../database/operational/entities';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConsultationsModule } from '../consultations/consultations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Booking, WalletCredit], 'patient'),
    TypeOrmModule.forFeature([User, AvailabilitySlot, DoctorProfile, PlatformSetting], 'operational'),
    AuthModule,
    NotificationsModule,
    forwardRef(() => ConsultationsModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackService],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
