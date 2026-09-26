import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import { Pool, PoolClient } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { envConfig } from '../../config/env.config';
import { NappiParser, ParsedProduct, ParsedPrice } from './nappi-parser';

export interface ImportSummary {
  rowsRead: number;
  inserted: number;
  updated: number;
  retired: number;
  skipped: number;
  warnings: Record<string, number>;
  durationSeconds: number;
  isIdempotent: boolean;
}

export interface ImportOptions {
  abortOnTruncation?: boolean;
  logger?: (msg: string) => void;
}

@Injectable()
export class NappiImporterService {
  private readonly logger = new Logger(NappiImporterService.name);
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: envConfig.OPERATIONAL_DB_HOST,
      port: envConfig.OPERATIONAL_DB_PORT,
      user: envConfig.OPERATIONAL_DB_USER,
      password: envConfig.OPERATIONAL_DB_PASSWORD,
      database: envConfig.OPERATIONAL_DB_NAME,
      ssl: envConfig.OPERATIONAL_DB_SSL ? { rejectUnauthorized: false } : false,
      max: 5,
    });
  }

  public async getPool(): Promise<Pool> {
    return this.pool;
  }

  /**
   * Stream and import Medis fixed-width NAPPI file with transactional merge.
   */
  public async importFile(
    filePath: string,
    options: ImportOptions = {},
  ): Promise<ImportSummary> {
    const startTime = Date.now();
    const log = options.logger || ((msg: string) => this.logger.log(msg));

    if (!fs.existsSync(filePath)) {
      throw new Error(`NAPPI file not found at path: ${filePath}`);
    }

    log(`Starting NAPPI file import from: ${filePath}`);

    const warnings = new Map<string, number>();
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create temporary staging tables
      await client.query(`
        CREATE TEMP TABLE stg_products (LIKE nappi_products INCLUDING DEFAULTS) ON COMMIT DROP;
      `);
      await client.query(`
        CREATE TEMP TABLE stg_prices (
          nappi_code text,
          price_type text,
          price numeric,
          effective_date date
        ) ON COMMIT DROP;
      `);

      log('Staging tables created. Streaming products to Postgres...');

      // 2. Pass 1: Stream products into stg_products
      const productStream = client.query(
        copyFrom(
          `COPY stg_products (
            nappi_code, product_code, pack_code, product_name, strength, strength_unit,
            dosage_form_code, dosage_form, pack_size, pack_uom, route, atc_mims_code,
            atc_mims_desc, generic_ind, excl_flag, excl_desc, single_comb, product_eff_date,
            brand_code, schedule, old_nappi_code, old_nappi_eff, new_nappi_code, new_nappi_eff,
            manuf_code, manuf_desc, mmap_ind, term_date, status, who_atc_code, who_atc_desc,
            is_medicine, is_active, row_hash
          ) FROM STDIN WITH (FORMAT csv, NULL '')`,
        ),
      );

      let rowsRead = 0;
      await new Promise<void>((resolve, reject) => {
        productStream.on('error', reject);
        productStream.on('finish', () => resolve());

        const rl = readline.createInterface({
          input: fs.createReadStream(filePath, { encoding: 'latin1' }),
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          const res = NappiParser.parseLine(line, warnings);
          if (res) {
            rowsRead++;
            const csvLine = NappiParser.toProductCsvRow(res.product) + '\n';
            if (!productStream.write(csvLine)) {
              rl.pause();
              productStream.once('drain', () => rl.resume());
            }
          }
        });

        rl.on('close', () => {
          productStream.end();
        });

        rl.on('error', reject);
      });

      log(`Loaded ${rowsRead} product rows into staging. Streaming prices...`);

      // 3. Pass 2: Stream prices into stg_prices
      const priceStream = client.query(
        copyFrom(
          `COPY stg_prices (nappi_code, price_type, price, effective_date) FROM STDIN WITH (FORMAT csv, NULL '')`,
        ),
      );

      let pricesRead = 0;
      await new Promise<void>((resolve, reject) => {
        priceStream.on('error', reject);
        priceStream.on('finish', () => resolve());

        const rl = readline.createInterface({
          input: fs.createReadStream(filePath, { encoding: 'latin1' }),
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          const res = NappiParser.parseLine(line);
          if (res && res.prices.length > 0) {
            for (const price of res.prices) {
              pricesRead++;
              const csvLine = NappiParser.toPriceCsvRow(price) + '\n';
              if (!priceStream.write(csvLine)) {
                rl.pause();
                priceStream.once('drain', () => rl.resume());
              }
            }
          }
        });

        rl.on('close', () => {
          priceStream.end();
        });

        rl.on('error', reject);
      });

      log(`Loaded ${pricesRead} price rows into staging.`);

      // 4. Index and analyze staging tables for optimal planner performance
      await client.query(`CREATE INDEX idx_stg_p_code ON stg_products(nappi_code);`);
      await client.query(`CREATE INDEX idx_stg_pr_code ON stg_prices(nappi_code);`);
      await client.query(`ANALYZE stg_products;`);
      await client.query(`ANALYZE stg_prices;`);

      // 5. Truncation guard check
      if (options.abortOnTruncation !== false) {
        const guardRes = await client.query(`
          SELECT 
            (SELECT count(*) FROM stg_products) as stg_count,
            (SELECT count(*) FROM nappi_products) as prod_count
        `);
        const stgCount = parseInt(guardRes.rows[0].stg_count, 10);
        const prodCount = parseInt(guardRes.rows[0].prod_count, 10);

        if (prodCount > 0 && stgCount < 0.5 * prodCount) {
          throw new Error(
            `Staged file has under half the existing rows (staged: ${stgCount}, existing: ${prodCount}); aborting import`,
          );
        }
      }

      // 6. Identify new and changed rows
      await client.query(`
        CREATE TEMP TABLE changed ON COMMIT DROP AS
        SELECT s.nappi_code
        FROM stg_products s
        LEFT JOIN nappi_products p USING (nappi_code)
        WHERE p.nappi_code IS NULL OR p.row_hash IS DISTINCT FROM s.row_hash;
        
        CREATE INDEX idx_changed_code ON changed(nappi_code);
        ANALYZE changed;
      `);

      // 7. Calculate exact metrics
      const statsRes = await client.query(`
        SELECT 
          (SELECT count(*) FROM changed c WHERE NOT EXISTS (SELECT 1 FROM nappi_products p WHERE p.nappi_code = c.nappi_code)) AS inserted,
          (SELECT count(*) FROM changed c WHERE EXISTS (SELECT 1 FROM nappi_products p WHERE p.nappi_code = c.nappi_code)) AS updated,
          (SELECT count(*) FROM nappi_products p WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM stg_products s WHERE s.nappi_code = p.nappi_code)) AS retired
      `);

      const inserted = parseInt(statsRes.rows[0].inserted, 10);
      const updated = parseInt(statsRes.rows[0].updated, 10);
      const retired = parseInt(statsRes.rows[0].retired, 10);
      const skipped = rowsRead - (inserted + updated);

      log(`Diff calculated: ${inserted} new, ${updated} changed, ${retired} to retire, ${skipped} unchanged.`);

      // 8. Update changed rows
      if (updated > 0) {
        await client.query(`
          UPDATE nappi_products p SET
            product_code = s.product_code, pack_code = s.pack_code, product_name = s.product_name,
            strength = s.strength, strength_unit = s.strength_unit,
            dosage_form_code = s.dosage_form_code, dosage_form = s.dosage_form,
            pack_size = s.pack_size, pack_uom = s.pack_uom, route = s.route,
            atc_mims_code = s.atc_mims_code, atc_mims_desc = s.atc_mims_desc,
            generic_ind = s.generic_ind, excl_flag = s.excl_flag, excl_desc = s.excl_desc,
            single_comb = s.single_comb, product_eff_date = s.product_eff_date,
            brand_code = s.brand_code, schedule = s.schedule,
            old_nappi_code = s.old_nappi_code, old_nappi_eff = s.old_nappi_eff,
            new_nappi_code = s.new_nappi_code, new_nappi_eff = s.new_nappi_eff,
            manuf_code = s.manuf_code, manuf_desc = s.manuf_desc, mmap_ind = s.mmap_ind,
            term_date = s.term_date, status = s.status,
            who_atc_code = s.who_atc_code, who_atc_desc = s.who_atc_desc,
            is_medicine = s.is_medicine, is_active = s.is_active,
            row_hash = s.row_hash, updated_at = now()
          FROM stg_products s
          JOIN changed c ON s.nappi_code = c.nappi_code
          WHERE p.nappi_code = s.nappi_code;
        `);
      }

      // 9. Insert new rows
      if (inserted > 0) {
        await client.query(`
          INSERT INTO nappi_products
          SELECT s.* FROM stg_products s
          JOIN changed c ON s.nappi_code = c.nappi_code
          LEFT JOIN nappi_products p ON s.nappi_code = p.nappi_code
          WHERE p.nappi_code IS NULL;
        `);
      }

      // 10. Retire codes absent from new file
      if (retired > 0) {
        await client.query(`
          UPDATE nappi_products p
          SET is_active = false, updated_at = now()
          WHERE p.is_active
            AND NOT EXISTS (SELECT 1 FROM stg_products s WHERE s.nappi_code = p.nappi_code);
        `);
      }

      // 11. Rebuild prices only for new / changed products
      if (inserted + updated > 0) {
        await client.query(`
          DELETE FROM nappi_prices p
          USING changed c
          WHERE p.nappi_code = c.nappi_code;
        `);
        await client.query(`
          INSERT INTO nappi_prices (nappi_code, price_type, price, effective_date)
          SELECT sp.nappi_code, sp.price_type, sp.price, sp.effective_date
          FROM stg_prices sp
          JOIN changed c ON sp.nappi_code = c.nappi_code;
        `);
      }

      await client.query('COMMIT');
      log('Transaction committed successfully.');

      // 12. Run ANALYZE on modified tables
      if (inserted + updated + retired > 0) {
        await client.query('ANALYZE nappi_products;');
        await client.query('ANALYZE nappi_prices;');
      }

      const durationSeconds = (Date.now() - startTime) / 1000;
      const isIdempotent = inserted === 0 && updated === 0 && retired === 0;

      const warningsObj: Record<string, number> = {};
      warnings.forEach((v, k) => {
        warningsObj[k] = v;
      });

      const summary: ImportSummary = {
        rowsRead,
        inserted,
        updated,
        retired,
        skipped,
        warnings: warningsObj,
        durationSeconds: parseFloat(durationSeconds.toFixed(2)),
        isIdempotent,
      };

      this.logSummary(summary, log);
      return summary;
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.logger.error(`NAPPI import failed, rolled back: ${err.message}`, err.stack);
      throw err;
    } finally {
      client.release();
    }
  }

  private logSummary(s: ImportSummary, log: (msg: string) => void) {
    log('==================================================');
    log('            NAPPI IMPORT SUMMARY                  ');
    log('==================================================');
    log(`  Total rows read:      ${s.rowsRead.toLocaleString()}`);
    log(`  Inserted (new):       ${s.inserted.toLocaleString()}`);
    log(`  Updated (changed):    ${s.updated.toLocaleString()}`);
    log(`  Retired (absent):     ${s.retired.toLocaleString()}`);
    log(`  Skipped (identical):  ${s.skipped.toLocaleString()}`);
    log(`  Idempotent run:       ${s.isIdempotent ? 'YES' : 'NO'}`);
    log(`  Duration:             ${s.durationSeconds}s`);
    if (Object.keys(s.warnings).length > 0) {
      log('  Layout Warnings:');
      for (const [warn, count] of Object.entries(s.warnings)) {
        log(`    - ${warn}: ${count}`);
      }
    } else {
      log('  Layout Warnings:      0 (none)');
    }
    log('==================================================');
  }

  public async onModuleDestroy() {
    await this.pool.end();
  }
}
