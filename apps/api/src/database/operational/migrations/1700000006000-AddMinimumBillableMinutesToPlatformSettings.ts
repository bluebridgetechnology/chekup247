import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinimumBillableMinutesToPlatformSettings1700000006000
  implements MigrationInterface
{
  name = 'AddMinimumBillableMinutesToPlatformSettings1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "minimum_billable_minutes" integer NOT NULL DEFAULT 30;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      DROP COLUMN IF EXISTS "minimum_billable_minutes";
    `);
  }
}
