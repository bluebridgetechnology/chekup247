import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewModeration1700000011000 implements MigrationInterface {
  name = 'AddReviewModeration1700000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "hidden_reason" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
      DROP COLUMN IF EXISTS "is_hidden",
      DROP COLUMN IF EXISTS "hidden_reason";
    `);
  }
}
