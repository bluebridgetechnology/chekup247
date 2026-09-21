import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Prescription, Consultation, Booking } from '../../database/patient/entities';
import { DoctorProfile, User, AuditLog } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';
import { ConsultationsModule } from '../consultations/consultations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionPdfService } from './prescription-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription, Consultation, Booking], 'patient'),
    TypeOrmModule.forFeature([DoctorProfile, User, AuditLog], 'operational'),
    BullModule.registerQueue({
      name: QUEUES.NOTIFICATIONS,
    }),
    forwardRef(() => ConsultationsModule),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionPdfService],
  exports: [PrescriptionsService, PrescriptionPdfService],
})
export class PrescriptionsModule {}
