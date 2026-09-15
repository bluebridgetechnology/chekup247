import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  getOperationalDbConfig,
  operationalEntities,
} from './operational/operational-db.config';
import {
  getPatientDbConfig,
  patientEntities,
} from './patient/patient-db.config';

@Global()
@Module({
  imports: [
    // 1. Operational Database (VPS / Local)
    TypeOrmModule.forRootAsync({
      name: 'operational',
      useFactory: () => getOperationalDbConfig(),
    }),
    TypeOrmModule.forFeature(operationalEntities, 'operational'),

    // 2. Patient Database (Local / VPS / AWS RDS af-south-1)
    TypeOrmModule.forRootAsync({
      name: 'patient',
      useFactory: () => getPatientDbConfig(),
    }),
    TypeOrmModule.forFeature(patientEntities, 'patient'),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
