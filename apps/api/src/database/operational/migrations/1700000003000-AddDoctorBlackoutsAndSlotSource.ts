import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorBlackoutsAndSlotSource1700000003000
  implements MigrationInterface
{
  name = 'AddDoctorBlackoutsAndSlotSource1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add source, external_window_id, is_locked to availability_slots
    await queryRunner.query(`
      ALTER TABLE "availability_slots"
      ADD COLUMN IF NOT EXISTS "source" varchar(50) NOT NULL DEFAULT 'direct',
      ADD COLUMN IF NOT EXISTS "external_window_id" varchar(255),
      ADD COLUMN IF NOT EXISTS "is_locked" boolean NOT NULL DEFAULT false;
    `);

    // 2. Add slot duration and buffer settings to platform_settings
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "default_slot_duration_minutes" integer NOT NULL DEFAULT 30,
      ADD COLUMN IF NOT EXISTS "default_buffer_minutes" integer NOT NULL DEFAULT 5;
    `);

    // 3. Create doctor_blackouts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_blackouts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL REFERENCES "doctor_profiles"("id") ON DELETE CASCADE,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "reason" varchar(255) NOT NULL DEFAULT 'Out of Office',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_blackouts_doctor_times" ON "doctor_blackouts"("doctor_id", "start_time", "end_time");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_blackouts";`);
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      DROP COLUMN IF EXISTS "default_buffer_minutes",
      DROP COLUMN IF EXISTS "default_slot_duration_minutes";
    `);
    await queryRunner.query(`
      ALTER TABLE "availability_slots"
      DROP COLUMN IF EXISTS "is_locked",
      DROP COLUMN IF EXISTS "external_window_id",
      DROP COLUMN IF EXISTS "source";
    `);
  }
}
