import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOperationalSchema1700000000000 implements MigrationInterface {
  name = 'InitOperationalSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_role_enum AS ENUM ('patient', 'doctor', 'admin');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'banned');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE verification_status_enum AS ENUM ('pending', 'verified', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE verification_source_enum AS ENUM ('platform', 'locumstaff');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payout_status_enum AS ENUM ('pending', 'paid', 'failed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "role" user_role_enum NOT NULL DEFAULT 'patient',
        "email" varchar(255) UNIQUE NOT NULL,
        "phone" varchar(50),
        "password_hash" varchar(255),
        "full_name" varchar(255) NOT NULL,
        "date_of_birth" date,
        "status" user_status_enum NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 2. Doctor Profiles Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "hpcsa_number" varchar(100) NOT NULL,
        "verification_status" verification_status_enum NOT NULL DEFAULT 'pending',
        "verification_source" verification_source_enum NOT NULL DEFAULT 'platform',
        "sso_provider" varchar(50),
        "sso_external_id" varchar(255),
        "specialty" varchar(255) NOT NULL DEFAULT 'General Practitioner',
        "bio" text,
        "rate_per_hour" decimal(10,2) NOT NULL DEFAULT 0.00,
        "rating_avg" decimal(3,2) NOT NULL DEFAULT 0.00,
        "documents_url" text[] NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 3. Availability Slots Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availability_slots" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL REFERENCES "doctor_profiles"("id") ON DELETE CASCADE,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_booked" boolean NOT NULL DEFAULT false,
        "is_recurring" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_slots_doctor_times" ON "availability_slots"("doctor_id", "start_time", "end_time");
    `);

    // 4. Payouts Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payouts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL REFERENCES "doctor_profiles"("id") ON DELETE CASCADE,
        "amount" decimal(12,2) NOT NULL,
        "status" payout_status_enum NOT NULL DEFAULT 'pending',
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "transaction_reference" varchar(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 5. Platform Settings Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "commission_percent" decimal(5,2) NOT NULL DEFAULT 15.00,
        "late_cancellation_deduction_percent" decimal(5,2) NOT NULL DEFAULT 30.00,
        "no_show_grace_minutes" int NOT NULL DEFAULT 10,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 6. Notification Preferences Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "channels" text[] NOT NULL DEFAULT '{email,whatsapp}',
        "reminders_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 7. Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "user_role" varchar(50),
        "patient_id" uuid,
        "action" varchar(100) NOT NULL,
        "ip_address" varchar(64),
        "user_agent" varchar(255),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs"("user_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_patient" ON "audit_logs"("patient_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_settings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payouts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_slots";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS payout_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS verification_source_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS verification_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role_enum;`);
  }
}
