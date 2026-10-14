import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingLeadMinutesToPlatformSettings1700000007000
  implements MigrationInterface
{
  name = 'AddBookingLeadMinutesToPlatformSettings1700000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "booking_lead_minutes" integer NOT NULL DEFAULT 15;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      DROP COLUMN IF EXISTS "booking_lead_minutes";
    `);
  }
}
