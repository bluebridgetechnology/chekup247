import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJoinGraceMinutes1700000009000 implements MigrationInterface {
  name = 'AddJoinGraceMinutes1700000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_settings"
      ADD COLUMN IF NOT EXISTS "join_grace_minutes" integer NOT NULL DEFAULT 10;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN IF EXISTS "join_grace_minutes";`);
  }
}
