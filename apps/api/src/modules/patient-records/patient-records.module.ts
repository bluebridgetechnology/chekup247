import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  Consultation,
  Prescription,
  PatientMedicalProfile,
  PatientDocument,
  PatientVital,
  PatientProblem,
} from '../../database/patient/entities';
import { AvailabilitySlot, User } from '../../database/operational/entities';
import { AuthModule } from '../auth/auth.module';
import { EhrController } from './ehr.controller';
import { EhrService } from './ehr.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature(
      [Booking, Consultation, Prescription, PatientMedicalProfile, PatientDocument, PatientVital, PatientProblem],
      'patient',
    ),
    TypeOrmModule.forFeature([User, AvailabilitySlot], 'operational'),
  ],
  controllers: [EhrController],
  providers: [EhrService],
})
export class PatientRecordsModule {}
