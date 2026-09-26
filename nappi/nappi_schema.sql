-- PostgreSQL schema + repeatable load for the Medis NAPPI file.
-- 1) python nappi_convert.py NAPPI.txt out/
-- 2) cd out && psql -d yourdb -f ../nappi_schema.sql
-- Re-run steps 1-2 for every new file: only new/changed rows are written.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS nappi_products (
    nappi_code       text PRIMARY KEY,          -- text: leading zeros matter
    product_code     text NOT NULL,
    pack_code        text NOT NULL,             -- last 3 digits (pack suffix)
    product_name     text NOT NULL,
    strength         numeric,
    strength_unit    text,
    dosage_form_code text,
    dosage_form      text,
    pack_size        numeric,
    pack_uom         text,
    route            text,                      -- route of administration; XX = non-medicine
    atc_mims_code    text,
    atc_mims_desc    text,
    generic_ind      text,
    excl_flag        text,                      -- Mediscor exclusion flag
    excl_desc        text,
    single_comb      text,
    product_eff_date date,
    brand_code       text,
    schedule         text,
    old_nappi_code   text,
    old_nappi_eff    date,
    new_nappi_code   text,                      -- set when this code was superseded
    new_nappi_eff    date,
    manuf_code       text,
    manuf_desc       text,
    mmap_ind         text,
    term_date        date,
    status           text,                      -- A = active
    who_atc_code     text,
    who_atc_desc     text,
    is_medicine      boolean NOT NULL,
    is_active        boolean NOT NULL,
    row_hash         text NOT NULL,
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nappi_prices (
    nappi_code     text NOT NULL REFERENCES nappi_products (nappi_code) ON DELETE CASCADE,
    price_type     text NOT NULL,               -- lstx (current, excl VAT), hist_1, hist_2, mmap_unit, mmap
    price          numeric NOT NULL,
    effective_date date,
    PRIMARY KEY (nappi_code, price_type)
);

CREATE INDEX IF NOT EXISTS nappi_name_trgm ON nappi_products USING gin (product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS nappi_med_active ON nappi_products (is_medicine, is_active);
CREATE INDEX IF NOT EXISTS nappi_old_code ON nappi_products (old_nappi_code) WHERE old_nappi_code IS NOT NULL;

-- ---------------- Load: stage, validate, merge (one transaction) ----------------
BEGIN;

CREATE TEMP TABLE stg_products (LIKE nappi_products INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE stg_prices (nappi_code text, price_type text, price numeric, effective_date date) ON COMMIT DROP;

\copy stg_products (nappi_code, product_code, pack_code, product_name, strength, strength_unit, dosage_form_code, dosage_form, pack_size, pack_uom, route, atc_mims_code, atc_mims_desc, generic_ind, excl_flag, excl_desc, single_comb, product_eff_date, brand_code, schedule, old_nappi_code, old_nappi_eff, new_nappi_code, new_nappi_eff, manuf_code, manuf_desc, mmap_ind, term_date, status, who_atc_code, who_atc_desc, is_medicine, is_active, row_hash) FROM 'products.csv' WITH (FORMAT csv, HEADER true)
\copy stg_prices FROM 'prices.csv' WITH (FORMAT csv, HEADER true)

-- Refuse to proceed if the file looks truncated or partial.
DO $$
BEGIN
    IF (SELECT count(*) FROM stg_products) < 0.5 * (SELECT count(*) FROM nappi_products) THEN
        RAISE EXCEPTION 'Staged file has under half the existing rows; aborting';
    END IF;
END $$;

-- Which codes are new or changed since the last load?
CREATE TEMP TABLE changed ON COMMIT DROP AS
SELECT s.nappi_code
FROM stg_products s
LEFT JOIN nappi_products p USING (nappi_code)
WHERE p.nappi_code IS NULL OR p.row_hash IS DISTINCT FROM s.row_hash;

-- Update changed rows
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
WHERE p.nappi_code = s.nappi_code
  AND s.nappi_code IN (SELECT nappi_code FROM changed);

-- Insert new rows
INSERT INTO nappi_products
SELECT s.* FROM stg_products s
WHERE s.nappi_code IN (SELECT nappi_code FROM changed)
  AND NOT EXISTS (SELECT 1 FROM nappi_products p WHERE p.nappi_code = s.nappi_code);

-- Codes absent from the new file are retired, never deleted
-- (old prescriptions may still reference them). Assumes a FULL master file.
UPDATE nappi_products p
SET is_active = false, updated_at = now()
WHERE p.is_active
  AND NOT EXISTS (SELECT 1 FROM stg_products s WHERE s.nappi_code = p.nappi_code);

-- Prices: rebuild only for new/changed products
DELETE FROM nappi_prices WHERE nappi_code IN (SELECT nappi_code FROM changed);
INSERT INTO nappi_prices
SELECT sp.* FROM stg_prices sp WHERE sp.nappi_code IN (SELECT nappi_code FROM changed);

COMMIT;

ANALYZE nappi_products;

-- Example: prescribing search (fuzzy name match, medicines only)
-- SELECT nappi_code, product_name, strength, strength_unit, dosage_form, pack_size, pack_uom
-- FROM nappi_products
-- WHERE is_medicine AND is_active AND product_name % 'propranolol'
-- ORDER BY similarity(product_name, 'propranolol') DESC
-- LIMIT 20;
