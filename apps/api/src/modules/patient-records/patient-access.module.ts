import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/patient/entities';
import { DoctorProfile } from '../../database/operational/entities';
import { PatientAccessService } from './patient-access.service';

/** Global so any controller serving patient data can enforce the same access rule. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Booking], 'patient'), TypeOrmModule.forFeature([DoctorProfile], 'operational')],
  providers: [PatientAccessService],
  exports: [PatientAccessService],
})
export class PatientAccessModule {}
