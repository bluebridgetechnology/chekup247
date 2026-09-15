import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationAndTokens1700000002000
  implements MigrationInterface
{
  name = 'AddEmailVerificationAndTokens1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add email verification & profile columns to users
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_email_verified" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);
    `);

    // 2. Create token type enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE token_type_enum AS ENUM ('email_verification', 'password_reset');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create verification_tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "verification_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(255) UNIQUE NOT NULL,
        "type" token_type_enum NOT NULL DEFAULT 'email_verification',
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_verification_tokens_user" ON "verification_tokens"("user_id");
      CREATE INDEX IF NOT EXISTS "idx_verification_tokens_hash" ON "verification_tokens"("token_hash");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "verification_tokens";`);
    await queryRunner.query(`DROP TYPE IF EXISTS token_type_enum;`);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "avatar_url",
      DROP COLUMN IF EXISTS "email_verified_at",
      DROP COLUMN IF EXISTS "is_email_verified";
    `);
  }
}
