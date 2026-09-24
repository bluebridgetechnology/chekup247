import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env or app .env robustly across monorepo layouts
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Operational Database (VPS / Local)
  OPERATIONAL_DB_HOST: z.string().default('127.0.0.1'),
  OPERATIONAL_DB_PORT: z.coerce.number().default(5434),
  OPERATIONAL_DB_USER: z.string().default('chekup_user'),
  OPERATIONAL_DB_PASSWORD: z.string().default('chekup_password'),
  OPERATIONAL_DB_NAME: z.string().default('chekup_operational'),
  OPERATIONAL_DB_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  DATABASE_OPERATIONAL_URL: z.string().optional(),
  DB_SYNCHRONIZE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),


  // Patient Database (Local / VPS / AWS RDS af-south-1)
  PATIENT_DB_HOST: z.string().default('127.0.0.1'),
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
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Storage (MinIO / S3)
  STORAGE_ENDPOINT: z.string().default('http://localhost:9000'),
  STORAGE_PUBLIC_ENDPOINT: z.string().optional(),
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

  // LocumStaff Partner Directory + OIDC SSO Integration.
  // These four values are registered on the LocumStaff side under
  // Admin → System → Integrations and must match exactly (handover §4).
  LOCUMSTAFF_API_URL: z.string().default('https://api.locumstaff.example'),
  LOCUMSTAFF_DIRECTORY_API_KEY: z.string().optional().default(''),
  LOCUMSTAFF_OIDC_CLIENT_ID: z.string().optional().default(''),
  LOCUMSTAFF_OIDC_CLIENT_SECRET: z.string().optional().default(''),
  // Must exactly match the redirect URI sent in /authorize and /token.
  // Defaults to the doctor portal's /callback when unset.
  LOCUMSTAFF_OIDC_REDIRECT_URI: z.string().optional().default(''),

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
  // TEMPORARY test bypass: when 'true', Paystack checkout initialization
  // returns a simulated success (redirect straight to the success callback)
  // instead of calling the Paystack API. For local/staging testing of
  // downstream flows (e.g. video consultations) while the Paystack account
  // is unavailable. NEVER enable in production with real payments.
  PAYSTACK_BYPASS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // Daily.co Video Consultations
  DAILY_API_KEY: z.string().optional().default(''),
  DAILY_DOMAIN: z.string().default('chekup247'),
  DAILY_API_URL: z.string().default('https://api.daily.co/v1'),

  // Brevo Transactional Email Integration (BE-804)
  BREVO_API_KEY: z.string().optional().default(''),
  BREVO_SENDER_EMAIL: z.string().default('notifications@chekup247.com'),
  BREVO_SENDER_NAME: z.string().default('ChekUp247 Telehealth'),
  // Destination inbox for patient/visitor contact-support inquiries.
  SUPPORT_EMAIL: z.string().default('support@chekup247.com'),
  SUPPORT_EMAIL_NAME: z.string().default('ChekUp247 Support'),

  // SMS Gateway Integration (SMS Portal primary, Twilio fallback)
  SMSPORTAL_API_KEY: z.string().optional().default(''),
  SMSPORTAL_API_SECRET: z.string().optional().default(''),
  SMSPORTAL_API_URL: z.string().default('https://rest.smsportal.com'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM_NUMBER: z.string().optional().default('+27110000000'),

  // WhatsApp Business API Integration (BE-806)
  WHATSAPP_API_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),

  // Security & Operations (Sprint 10)
  ADMIN_IP_ALLOWLIST: z.string().default(''),
  SENTRY_DSN: z.string().optional().default(''),

  // One-time bootstrap credential for the FIRST admin account. Required
  // in production since the admin panel has no signup route — this is
  // the only way an initial administrator gets created. The seeded
  // account must change this password on first login (see AdminService).
  ADMIN_BOOTSTRAP_EMAIL: z.string().default('admin@chekup247.com'),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional().default(''),
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const envConfig = parsed.data;
export type EnvConfig = typeof envConfig;

// ---------------------------------------------------------------------------
// Production secret hardening — fail loudly at boot rather than silently
// running with a known, publicly-visible development default.
// ---------------------------------------------------------------------------
if (envConfig.NODE_ENV === 'production') {
  const productionFatalErrors: string[] = [];

  if (envConfig.JWT_SECRET === 'super-secret-development-jwt-key-minimum-32-chars') {
    productionFatalErrors.push('JWT_SECRET is still the development default — set a unique production secret.');
  }
  if (envConfig.ADMIN_SESSION_SECRET === 'admin-isolated-session-secret-key-32-chars') {
    productionFatalErrors.push('ADMIN_SESSION_SECRET is still the development default — set a unique production secret.');
  }
  if (!envConfig.ADMIN_BOOTSTRAP_PASSWORD) {
    productionFatalErrors.push(
      'ADMIN_BOOTSTRAP_PASSWORD is required in production: the admin panel has no signup route, ' +
        'so this is the only way to provision the first administrator account.',
    );
  }
  if (envConfig.PAYSTACK_BYPASS) {
    productionFatalErrors.push(
      'PAYSTACK_BYPASS is enabled — simulated payments would run in production. Set PAYSTACK_BYPASS=false and configure live Paystack keys.',
    );
  }

  if (productionFatalErrors.length > 0) {
    console.error('❌ FATAL: Production environment failed security validation:');
    for (const msg of productionFatalErrors) {
      console.error(`  - ${msg}`);
    }
    process.exit(1);
  }
}
