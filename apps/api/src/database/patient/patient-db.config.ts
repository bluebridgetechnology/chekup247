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
} from './entities';

export const patientEntities = [
  Booking,
  Payment,
  Consultation,
  ConsultationExtension,
  Prescription,
  Review,
  Notification,
  WalletCredit,
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
  synchronize: envConfig.NODE_ENV !== 'production', // Use migrations in prod
  logging: envConfig.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  autoLoadEntities: false,
});
