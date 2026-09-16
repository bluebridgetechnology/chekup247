import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env or app .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Operational Database (VPS / Local)
  OPERATIONAL_DB_HOST: z.string().default('localhost'),
  OPERATIONAL_DB_PORT: z.coerce.number().default(5432),
  OPERATIONAL_DB_USER: z.string().default('chekup_user'),
  OPERATIONAL_DB_PASSWORD: z.string().default('chekup_password'),
  OPERATIONAL_DB_NAME: z.string().default('chekup_operational'),
  OPERATIONAL_DB_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  DATABASE_OPERATIONAL_URL: z.string().optional(),

  // Patient Database (Local / VPS / AWS RDS af-south-1)
  PATIENT_DB_HOST: z.string().default('localhost'),
  PATIENT_DB_PORT: z.coerce.number().default(5433),
  PATIENT_DB_USER: z.string().default('chekup_user'),
  PATIENT_DB_PASSWORD: z.string().default('chekup_password'),
  PATIENT_DB_NAME: z.string().default('chekup_patient'),
  PATIENT_DB_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  DATABASE_PATIENT_URL: z.string().optional(),

  // Redis & BullMQ
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Storage (MinIO / S3)
  STORAGE_ENDPOINT: z.string().default('http://localhost:9000'),
  STORAGE_REGION: z.string().default('af-south-1'),
  STORAGE_ACCESS_KEY: z.string().default('minioadmin'),
  STORAGE_SECRET_KEY: z.string().default('minioadminpassword'),
  STORAGE_BUCKET_DOCUMENTS: z.string().default('chekup-documents'),
  STORAGE_BUCKET_PRESCRIPTIONS: z.string().default('chekup-prescriptions'),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // Security
  JWT_SECRET: z.string().min(16).default('super-secret-development-jwt-key-minimum-32-chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_SESSION_SECRET: z.string().min(16).default('admin-isolated-session-secret-key-32-chars'),

  // URLs
  API_BASE_URL: z.string().default('http://localhost:4000'),
  PATIENT_WEB_URL: z.string().default('http://localhost:3000'),
  DOCTOR_PORTAL_URL: z.string().default('http://localhost:3001'),
  ADMIN_PANEL_URL: z.string().default('http://localhost:3002'),

  // LocumStaff Partner Directory Integration
  LOCUMSTAFF_API_URL: z.string().default('https://api.locumstaff.example'),
  LOCUMSTAFF_DIRECTORY_API_KEY: z.string().optional().default(''),

  // WHO ICD-10 API Integration
  WHO_ICD_CLIENT_ID: z
    .string()
    .default('ee7c2d56-06e6-4d70-bc20-dc9ba22d6343_b4047903-701a-40ab-aa61-ecc86861e989'),
  WHO_ICD_CLIENT_SECRET: z
    .string()
    .default('QOPLz7qUuTRW5DdzD8Cf1cMm2NI/0if9ZUR8/KKibTA='),

  // Paystack Payments Integration
  PAYSTACK_SECRET_KEY: z.string().default('sk_test_mock_paystack_secret_key'),
  PAYSTACK_PUBLIC_KEY: z.string().default('pk_test_mock_paystack_public_key'),
  PAYSTACK_API_URL: z.string().default('https://api.paystack.co'),

  // Daily.co Video Consultations
  DAILY_API_KEY: z.string().optional().default(''),
  DAILY_DOMAIN: z.string().default('chekup247'),
  DAILY_API_URL: z.string().default('https://api.daily.co/v1'),

  // Brevo Transactional Email Integration (BE-804)
  BREVO_API_KEY: z.string().optional().default(''),
  BREVO_SENDER_EMAIL: z.string().default('notifications@chekup247.co.za'),
  BREVO_SENDER_NAME: z.string().default('ChekUp247 Telehealth'),

  // SMS Gateway Integration (BE-805)
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM_NUMBER: z.string().optional().default('+27110000000'),

  // WhatsApp Business API Integration (BE-806)
  WHATSAPP_API_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),

  // Security & Operations (Sprint 10)
  ADMIN_IP_ALLOWLIST: z.string().default(''),
  SENTRY_DSN: z.string().optional().default(''),
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const envConfig = parsed.data;
export type EnvConfig = typeof envConfig;
