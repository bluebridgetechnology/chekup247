import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  Consultation,
  ConsultationExtension,
  Booking,
  Payment,
  Prescription,
  PatientMedicalProfile,
  PatientDocument,
} from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { DailyService } from './daily.service';
import { ConsultationGateway } from './consultation.gateway';
import { NoShowProcessor } from './no-show.processor';
import { PatientDemoSeederService } from './patient-demo-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        Consultation,
        ConsultationExtension,
        Booking,
        Payment,
        Prescription,
        PatientMedicalProfile,
        PatientDocument,
      ],
      'patient',
    ),
    TypeOrmModule.forFeature(
      [AvailabilitySlot, DoctorProfile, User],
      'operational',
    ),
    BullModule.registerQueue({
      name: QUEUES.NO_SHOW,
    }),
    forwardRef(() => PaymentsModule),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [ConsultationsController],
  providers: [
    ConsultationsService,
    DailyService,
    ConsultationGateway,
    NoShowProcessor,
    PatientDemoSeederService,
  ],
  exports: [ConsultationsService, DailyService, ConsultationGateway, PatientDemoSeederService],
})
export class ConsultationsModule {}
