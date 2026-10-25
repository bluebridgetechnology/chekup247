import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envConfig } from '../../config/env.config';
import {
  Booking,
  Payment,
  Consultation,
  ConsultationExtension,
  Prescription,
  Review,
  Notification,
  WalletCredit,
  PatientMedicalProfile,
  PatientDocument,
  Dispute,
  PatientVital,
  PatientProblem,
} from './entities';
import { InitPatientSchema1700000001000 } from './migrations/1700000001000-InitPatientSchema';
import { AddDisputesTable1700000006000 } from './migrations/1700000006000-AddDisputesTable';
import { AddReviewModeration1700000011000 } from './migrations/1700000012000-AddReviewModeration';
import { AddConsultationModeToBookings1761264000000 } from './migrations/1761264000000-AddConsultationModeToBookings';
import { AddPatientRecords1761350000000 } from './migrations/1761350000000-AddPatientRecords';

export const patientEntities = [
  Booking,
  Payment,
  Consultation,
  ConsultationExtension,
  Prescription,
  Review,
  Notification,
  WalletCredit,
  PatientMedicalProfile,
  PatientDocument,
  Dispute,
  PatientVital,
  PatientProblem,
];

export const getPatientDbConfig = (): TypeOrmModuleOptions => ({
  name: 'patient',
  type: 'postgres',
  host: envConfig.PATIENT_DB_HOST,
  port: envConfig.PATIENT_DB_PORT,
  username: envConfig.PATIENT_DB_USER,
  password: envConfig.PATIENT_DB_PASSWORD,
  database: envConfig.PATIENT_DB_NAME,
  ssl: envConfig.PATIENT_DB_SSL ? { rejectUnauthorized: false } : false,
  entities: patientEntities,
  migrations: [
    InitPatientSchema1700000001000,
    AddDisputesTable1700000006000,
    AddReviewModeration1700000011000,
    AddConsultationModeToBookings1761264000000,
    AddPatientRecords1761350000000,
  ],
  migrationsRun: false,
  synchronize: envConfig.NODE_ENV !== 'production' || envConfig.DB_SYNCHRONIZE,
  logging: envConfig.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  autoLoadEntities: false,
});
