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
  Testimonial,
} from './entities';
import { InitOperationalSchema1700000000000 } from './migrations/1700000000000-InitOperationalSchema';
import { AddEmailVerificationAndTokens1700000002000 } from './migrations/1700000002000-AddEmailVerificationAndTokens';
import { AddDoctorBlackoutsAndSlotSource1700000003000 } from './migrations/1700000003000-AddDoctorBlackoutsAndSlotSource';
import { AddPaystackSettingsToPlatformSettings1700000004000 } from './migrations/1700000004000-AddPaystackSettingsToPlatformSettings';
import { AlterUserAvatarUrlToText1700000004000 } from './migrations/1700000004000-AlterUserAvatarUrlToText';
import { AddUserMustChangePassword1700000005000 } from './migrations/1700000005000-AddUserMustChangePassword';
import { AddPayoutHoldAndApproval1700000007000 } from './migrations/1700000008000-AddPayoutHoldAndApproval';
import { AddAdminSubRole1700000009000 } from './migrations/1700000010000-AddAdminSubRole';
import { AddUserTotp1700000013000 } from './migrations/1700000014000-AddUserTotp';
import { AddDoctorNameTitleColumns1700000014000 } from './migrations/1700000015000-AddDoctorNameTitleColumns';

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
  Testimonial,
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
  migrations: [
    InitOperationalSchema1700000000000,
    AddEmailVerificationAndTokens1700000002000,
    AddDoctorBlackoutsAndSlotSource1700000003000,
    AddPaystackSettingsToPlatformSettings1700000004000,
    AlterUserAvatarUrlToText1700000004000,
    AddUserMustChangePassword1700000005000,
    AddPayoutHoldAndApproval1700000007000,
    AddAdminSubRole1700000009000,
    AddUserTotp1700000013000,
    AddDoctorNameTitleColumns1700000014000,
  ],
  migrationsRun: false,
  synchronize: envConfig.NODE_ENV !== 'production' || envConfig.DB_SYNCHRONIZE,
  logging: envConfig.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  autoLoadEntities: false,
});
