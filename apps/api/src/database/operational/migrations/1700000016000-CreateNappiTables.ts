import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNappiTables1700000016000 implements MigrationInterface {
  name = 'CreateNappiTables1700000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nappi_products" (
        "nappi_code" text PRIMARY KEY,
        "product_code" text NOT NULL,
        "pack_code" text NOT NULL,
        "product_name" text NOT NULL,
        "strength" numeric,
        "strength_unit" text,
        "dosage_form_code" text,
        "dosage_form" text,
        "pack_size" numeric,
        "pack_uom" text,
        "route" text,
        "atc_mims_code" text,
        "atc_mims_desc" text,
        "generic_ind" text,
        "excl_flag" text,
        "excl_desc" text,
        "single_comb" text,
        "product_eff_date" date,
        "brand_code" text,
        "schedule" text,
        "old_nappi_code" text,
        "old_nappi_eff" date,
        "new_nappi_code" text,
        "new_nappi_eff" date,
        "manuf_code" text,
        "manuf_desc" text,
        "mmap_ind" text,
        "term_date" date,
        "status" text,
        "who_atc_code" text,
        "who_atc_desc" text,
        "is_medicine" boolean NOT NULL,
        "is_active" boolean NOT NULL,
        "row_hash" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nappi_prices" (
        "nappi_code" text NOT NULL REFERENCES "nappi_products" ("nappi_code") ON DELETE CASCADE,
        "price_type" text NOT NULL,
        "price" numeric NOT NULL,
        "effective_date" date,
        PRIMARY KEY ("nappi_code", "price_type")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "nappi_name_trgm" ON "nappi_products" USING gin ("product_name" gin_trgm_ops);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "nappi_med_active" ON "nappi_products" ("is_medicine", "is_active");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "nappi_old_code" ON "nappi_products" ("old_nappi_code") WHERE "old_nappi_code" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "nappi_prices";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nappi_products";`);
  }
}
