import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envConfig } from '../../config/env.config';
import {
  User,
  DoctorProfile,
  AvailabilitySlot,
  Payout,
  PlatformSetting,
  NotificationPreference,
  AuditLog,
  VerificationToken,
  Icd10Code,
  DoctorBlackout,
} from './entities';

export const operationalEntities = [
  User,
  DoctorProfile,
  AvailabilitySlot,
  Payout,
  PlatformSetting,
  NotificationPreference,
  AuditLog,
  VerificationToken,
  Icd10Code,
  DoctorBlackout,
];


export const getOperationalDbConfig = (): TypeOrmModuleOptions => ({
  name: 'operational',
  type: 'postgres',
  host: envConfig.OPERATIONAL_DB_HOST,
  port: envConfig.OPERATIONAL_DB_PORT,
  username: envConfig.OPERATIONAL_DB_USER,
  password: envConfig.OPERATIONAL_DB_PASSWORD,
  database: envConfig.OPERATIONAL_DB_NAME,
  ssl: envConfig.OPERATIONAL_DB_SSL ? { rejectUnauthorized: false } : false,
  entities: operationalEntities,
  synchronize: envConfig.NODE_ENV !== 'production', // Use migrations in prod
  logging: envConfig.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  autoLoadEntities: false,
});
