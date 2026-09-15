import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  Consultation,
  ConsultationExtension,
  Booking,
  Payment,
} from '../../database/patient/entities';
import { AvailabilitySlot, DoctorProfile, User } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';
import { PaymentsModule } from '../payments/payments.module';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { DailyService } from './daily.service';
import { ConsultationGateway } from './consultation.gateway';
import { NoShowProcessor } from './no-show.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [Consultation, ConsultationExtension, Booking, Payment],
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
  ],
  controllers: [ConsultationsController],
  providers: [
    ConsultationsService,
    DailyService,
    ConsultationGateway,
    NoShowProcessor,
  ],
  exports: [ConsultationsService, DailyService, ConsultationGateway],
})
export class ConsultationsModule {}
