import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPatientSchema1700000001000 implements MigrationInterface {
  name = 'InitPatientSchema1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status_enum AS ENUM ('unpaid', 'held', 'released', 'refunded');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_record_status_enum AS ENUM ('pending', 'success', 'failed', 'refunded');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE extension_status_enum AS ENUM ('requested', 'approved', 'declined', 'paid');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_delivery_status_enum AS ENUM ('queued', 'sent', 'failed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Bookings Table (decoupled doctor_id and slot_id plain UUIDs)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "slot_id" uuid NOT NULL,
        "status" booking_status_enum NOT NULL DEFAULT 'pending',
        "price" decimal(10,2) NOT NULL,
        "commission_amount" decimal(10,2) NOT NULL,
        "payment_status" payment_status_enum NOT NULL DEFAULT 'unpaid',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_bookings_patient" ON "bookings"("patient_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_bookings_doctor" ON "bookings"("doctor_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_bookings_slot" ON "bookings"("slot_id");
    `);

    // 2. Payments Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "amount" decimal(10,2) NOT NULL,
        "provider" varchar(50) NOT NULL DEFAULT 'paystack',
        "provider_ref" varchar(255) UNIQUE NOT NULL,
        "authorization_code" varchar(255),
        "status" payment_record_status_enum NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_payments_ref" ON "payments"("provider_ref");
    `);

    // 3. Consultations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consultations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id" uuid UNIQUE NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "video_room_id" varchar(255) NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "doctor_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_consultations_room" ON "consultations"("video_room_id");
    `);

    // 4. Consultation Extensions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consultation_extensions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "consultation_id" uuid NOT NULL REFERENCES "consultations"("id") ON DELETE CASCADE,
        "duration_minutes" int NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "payment_id" uuid,
        "status" extension_status_enum NOT NULL DEFAULT 'requested',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 5. Prescriptions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prescriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "consultation_id" uuid NOT NULL REFERENCES "consultations"("id") ON DELETE CASCADE,
        "doctor_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "medications" jsonb NOT NULL,
        "icd10_code" varchar(20) NOT NULL,
        "schedule_flag" varchar(10),
        "supervision_declaration" text,
        "pdf_url" varchar(500),
        "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_prescriptions_patient" ON "prescriptions"("patient_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_prescriptions_doctor" ON "prescriptions"("doctor_id", "created_at");
    `);

    // 6. Reviews Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "booking_id" uuid UNIQUE NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "rating" int NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_reviews_doctor" ON "reviews"("doctor_id", "rating");
    `);

    // 7. Notifications Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipient_id" uuid NOT NULL,
        "channel" varchar(50) NOT NULL,
        "template_id" varchar(100) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "status" notification_delivery_status_enum NOT NULL DEFAULT 'queued',
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_notifications_recipient" ON "notifications"("recipient_id", "created_at");
    `);

    // 8. Wallet Credits Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_credits" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "patient_id" uuid NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'ZAR',
        "reason" varchar(255) NOT NULL,
        "booking_id" uuid,
        "is_redeemed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_wallet_credits_patient" ON "wallet_credits"("patient_id", "is_redeemed");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_credits";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prescriptions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consultation_extensions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consultations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings";`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_delivery_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS extension_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_record_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS booking_status_enum;`);
  }
}
