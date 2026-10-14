import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlotHolds1700000019000 implements MigrationInterface {
  name = 'AddSlotHolds1700000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "availability_slots"
      ADD COLUMN IF NOT EXISTS "hold_token" varchar(64),
      ADD COLUMN IF NOT EXISTS "hold_expires_at" timestamp with time zone;
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "slot_hold_minutes" integer NOT NULL DEFAULT 10;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "availability_slots"
      DROP COLUMN IF EXISTS "hold_token",
      DROP COLUMN IF EXISTS "hold_expires_at";
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_settings" DROP COLUMN IF EXISTS "slot_hold_minutes";
    `);
  }
}
