import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserActiveSession1700000022000 implements MigrationInterface {
  name = 'AddUserActiveSession1700000022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_session_id" uuid;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_session_started_at" timestamptz;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "active_session_started_at";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "active_session_id";`);
  }
}
