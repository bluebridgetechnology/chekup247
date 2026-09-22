import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaystackSettingsToPlatformSettings1700000004000
  implements MigrationInterface
{
  name = 'AddPaystackSettingsToPlatformSettings1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "paystack_mode" varchar(10) NOT NULL DEFAULT 'test',
      ADD COLUMN IF NOT EXISTS "paystack_test_secret_key" text,
      ADD COLUMN IF NOT EXISTS "paystack_test_public_key" text,
      ADD COLUMN IF NOT EXISTS "paystack_live_secret_key" text,
      ADD COLUMN IF NOT EXISTS "paystack_live_public_key" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      DROP COLUMN IF EXISTS "paystack_live_public_key",
      DROP COLUMN IF EXISTS "paystack_live_secret_key",
      DROP COLUMN IF EXISTS "paystack_test_public_key",
      DROP COLUMN IF EXISTS "paystack_test_secret_key",
      DROP COLUMN IF EXISTS "paystack_mode";
    `);
  }
}
