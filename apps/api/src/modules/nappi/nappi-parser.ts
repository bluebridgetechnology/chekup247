import * as crypto from 'crypto';

export const RECORD_LEN = 553;

export interface ParsedProduct {
  nappi_code: string;
  product_code: string;
  pack_code: string;
  product_name: string;
  strength: string | null;
  strength_unit: string | null;
  dosage_form_code: string | null;
  dosage_form: string | null;
  pack_size: string | null;
  pack_uom: string | null;
  route: string | null;
  atc_mims_code: string | null;
  atc_mims_desc: string | null;
  generic_ind: string | null;
  excl_flag: string | null;
  excl_desc: string | null;
  single_comb: string | null;
  product_eff_date: string | null;
  brand_code: string | null;
  schedule: string | null;
  old_nappi_code: string | null;
  old_nappi_eff: string | null;
  new_nappi_code: string | null;
  new_nappi_eff: string | null;
  manuf_code: string | null;
  manuf_desc: string | null;
  mmap_ind: string | null;
  term_date: string | null;
  status: string | null;
  who_atc_code: string | null;
  who_atc_desc: string | null;
  is_medicine: boolean;
  is_active: boolean;
  row_hash: string;
}

export interface ParsedPrice {
  nappi_code: string;
  price_type: 'lstx' | 'hist_1' | 'hist_2' | 'mmap_unit' | 'mmap';
  price: string;
  effective_date: string | null;
}

export interface ParseResult {
  product: ParsedProduct;
  prices: ParsedPrice[];
}

export const PRICE_CONFIGS: Array<{
  type: ParsedPrice['price_type'];
  valSlice: [number, number];
  dateSlice: [number, number];
  decimals: number;
}> = [
  { type: 'lstx', valSlice: [307, 319], dateSlice: [319, 327], decimals: 2 },
  { type: 'hist_1', valSlice: [327, 339], dateSlice: [339, 347], decimals: 2 },
  { type: 'hist_2', valSlice: [347, 359], dateSlice: [359, 367], decimals: 2 },
  { type: 'mmap_unit', valSlice: [422, 435], dateSlice: [448, 456], decimals: 3 },
  { type: 'mmap', valSlice: [435, 448], dateSlice: [448, 456], decimals: 3 },
];

export class NappiParser {
  /**
   * Parse a single fixed-width line (553 characters).
   */
  public static parseLine(
    rawLine: string,
    warnings?: Map<string, number>,
  ): ParseResult | null {
    let line = rawLine.replace(/[\r\n]+$/, '');
    if (!line.trim()) {
      return null;
    }

    if (line.length !== RECORD_LEN) {
      this.recordWarning(warnings, `line length != ${RECORD_LEN}`);
      line = line.padEnd(RECORD_LEN, ' ').slice(0, RECORD_LEN);
    }

    const code = line.slice(0, 11).trim();
    if (!code || !/^\d+$/.test(code)) {
      this.recordWarning(warnings, 'skipped: NAPPI code not numeric');
      return null;
    }

    const slice = (start: number, end: number) => line.slice(start, end).trim();

    const d = (field: string, start: number, end: number) =>
      this.parseDate(slice(start, end), field, warnings);

    const route = slice(126, 128);
    const isMedicine = route !== 'XX';
    const status = slice(465, 466);
    const isActive = status === 'A';

    // Compute MD5 hash of trimmed line
    const rowHash = crypto
      .createHash('md5')
      .update(line.trimEnd(), 'utf8')
      .digest('hex');

    const product: ParsedProduct = {
      nappi_code: code,
      product_code: code.slice(0, -3),
      pack_code: code.slice(-3),
      product_name: slice(11, 41),
      strength: this.parseScaled(slice(41, 53), 3),
      strength_unit: slice(53, 64) || null,
      dosage_form_code: slice(64, 68) || null,
      dosage_form: slice(68, 118) || null,
      pack_size: this.parseScaled(slice(118, 126), 2),
      pack_uom: slice(238, 240) || null,
      route: route || null,
      atc_mims_code: slice(128, 135) || null,
      atc_mims_desc: slice(135, 185) || null,
      generic_ind: slice(185, 186) || null,
      excl_flag: slice(186, 187) || null,
      excl_desc: slice(187, 237) || null,
      single_comb: slice(237, 238) || null,
      product_eff_date: d('product_eff_date', 240, 248),
      brand_code: slice(248, 268) || null,
      schedule: slice(268, 269) || null,
      old_nappi_code: slice(269, 280) || null,
      old_nappi_eff: d('old_nappi_eff', 280, 288),
      new_nappi_code: slice(288, 299) || null,
      new_nappi_eff: d('new_nappi_eff', 299, 307),
      manuf_code: slice(367, 372) || null,
      manuf_desc: slice(372, 422) || null,
      mmap_ind: slice(456, 457) || null,
      term_date: d('term_date', 457, 465),
      status: status || null,
      who_atc_code: slice(466, 473) || null,
      who_atc_desc: slice(473, 553) || null,
      is_medicine: isMedicine,
      is_active: isActive,
      row_hash: rowHash,
    };

    const prices: ParsedPrice[] = [];
    for (const cfg of PRICE_CONFIGS) {
      const priceVal = this.parsePrice(
        slice(cfg.valSlice[0], cfg.valSlice[1]),
        cfg.decimals,
      );
      if (priceVal) {
        prices.push({
          nappi_code: code,
          price_type: cfg.type,
          price: priceVal,
          effective_date: d(
            `${cfg.type}_date`,
            cfg.dateSlice[0],
            cfg.dateSlice[1],
          ),
        });
      }
    }

    return { product, prices };
  }

  public static parseDate(
    s: string,
    field: string,
    warnings?: Map<string, number>,
  ): string | null {
    const val = s.trim();
    if (!val || /^0+$/.test(val)) {
      return null;
    }
    if (val.length !== 8 || !/^\d{8}$/.test(val)) {
      this.recordWarning(warnings, `unparseable date in ${field}`);
      return null;
    }

    const year = parseInt(val.slice(0, 4), 10);
    const month = parseInt(val.slice(4, 6), 10);
    const day = parseInt(val.slice(6, 8), 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      this.recordWarning(warnings, `unparseable date in ${field}`);
      return null;
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  public static parseScaled(s: string, places: number): string | null {
    const val = s.trim();
    if (!val || !/^\d+$/.test(val)) {
      return null;
    }
    const num = BigInt(val);
    if (num === 0n) {
      return null;
    }

    const str = num.toString().padStart(places + 1, '0');
    const intPart = str.slice(0, str.length - places);
    let fracPart = str.slice(str.length - places).replace(/0+$/, '');

    return fracPart ? `${intPart}.${fracPart}` : intPart;
  }

  public static parsePrice(s: string, places: number): string | null {
    const val = s.trim();
    if (!val) {
      return null;
    }
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0) {
      return null;
    }
    return n.toFixed(places);
  }

  public static escapeCsv(val: any): string {
    if (val === null || val === undefined) {
      return '';
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  public static toProductCsvRow(p: ParsedProduct): string {
    return [
      p.nappi_code,
      p.product_code,
      p.pack_code,
      this.escapeCsv(p.product_name),
      p.strength ?? '',
      this.escapeCsv(p.strength_unit),
      this.escapeCsv(p.dosage_form_code),
      this.escapeCsv(p.dosage_form),
      p.pack_size ?? '',
      this.escapeCsv(p.pack_uom),
      this.escapeCsv(p.route),
      this.escapeCsv(p.atc_mims_code),
      this.escapeCsv(p.atc_mims_desc),
      this.escapeCsv(p.generic_ind),
      this.escapeCsv(p.excl_flag),
      this.escapeCsv(p.excl_desc),
      this.escapeCsv(p.single_comb),
      p.product_eff_date ?? '',
      this.escapeCsv(p.brand_code),
      this.escapeCsv(p.schedule),
      this.escapeCsv(p.old_nappi_code),
      p.old_nappi_eff ?? '',
      this.escapeCsv(p.new_nappi_code),
      p.new_nappi_eff ?? '',
      this.escapeCsv(p.manuf_code),
      this.escapeCsv(p.manuf_desc),
      this.escapeCsv(p.mmap_ind),
      p.term_date ?? '',
      this.escapeCsv(p.status),
      this.escapeCsv(p.who_atc_code),
      this.escapeCsv(p.who_atc_desc),
      p.is_medicine ? 'true' : 'false',
      p.is_active ? 'true' : 'false',
      p.row_hash,
    ].join(',');
  }

  public static toPriceCsvRow(pr: ParsedPrice): string {
    return [
      pr.nappi_code,
      pr.price_type,
      pr.price,
      pr.effective_date ?? '',
    ].join(',');
  }

  private static recordWarning(
    warnings: Map<string, number> | undefined,
    key: string,
  ) {
    if (!warnings) return;
    warnings.set(key, (warnings.get(key) || 0) + 1);
  }
}
