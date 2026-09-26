import { NappiParser, RECORD_LEN } from './nappi-parser';

describe('NappiParser (Unit)', () => {
  // Sample real line: 9-digit medicine (Propranolol)
  const sample9DigitMedicine =
    '080824002  ' + // 0:11 nappi_code
    'PROPRANOLOL NAM 4MG/ML SUSP   ' + // 11:41 product_name (30 chars)
    '000000004000' + // 41:53 strength_raw (4.000)
    'MG/ML      ' + // 53:64 strength_unit (11 chars)
    '0244' + // 64:68 dosage_form_code (4 chars)
    'Suspension                                        ' + // 68:118 dosage_form (50 chars)
    '00010000' + // 118:126 pack_size_raw (100.00)
    'OR' + // 126:128 route (2 chars, != XX -> medicine)
    'C07AA05' + // 128:135 atc_mims_code (7 chars)
    'PROPRANOLOL                                       ' + // 135:185 atc_mims_desc (50 chars)
    'N' + // 185:186 generic_ind (1 char)
    'N' + // 186:187 excl_flag (1 char)
    '                                                  ' + // 187:237 excl_desc (50 chars)
    'S' + // 237:238 single_comb (1 char)
    'ML' + // 238:240 pack_uom (2 chars)
    '20180401' + // 240:248 product_eff_date (8 chars)
    '                    ' + // 248:268 brand_code (20 chars)
    '4' + // 268:269 schedule (1 char)
    '           ' + // 269:280 old_nappi_code (11 chars)
    '00000000' + // 280:288 old_nappi_eff (8 chars)
    '           ' + // 288:299 new_nappi_code (11 chars)
    '00000000' + // 299:307 new_nappi_eff (8 chars)
    '000000075.50' + // 307:319 price_lstx (12 chars)
    '20210101' + // 319:327 price_lstx_date (8 chars)
    '000000070.00' + // 327:339 price_hist1 (12 chars)
    '20200101' + // 339:347 price_hist1_date (8 chars)
    '000000065.00' + // 347:359 price_hist2 (12 chars)
    '20190101' + // 359:367 price_hist2_date (8 chars)
    '01234' + // 367:372 manuf_code (5 chars)
    'Intersana                                         ' + // 372:422 manuf_desc (50 chars)
    '000000000.000' + // 422:435 mmap_unit_price (13 chars)
    '000000000.000' + // 435:448 mmap_price (13 chars)
    '00000000' + // 448:456 mmap_price_date (8 chars)
    'N' + // 456:457 mmap_ind (1 char)
    '00000000' + // 457:465 term_date (8 chars)
    'A' + // 465:466 status (1 char: A = active)
    'C07AA05' + // 466:473 who_atc_code (7 chars)
    'PROPRANOLOL                                                                     '; // 473:553 who_atc_desc (80 chars)

  // Sample real line: 10-digit superseded item with new_nappi_code
  const sample10DigitSuperseded =
    '3000353001 ' + // 0:11 nappi_code (10 digits + 1 space)
    'PROPRANOLOL NAM ONLY 10MG TABS' + // 11:41 product_name (30 chars)
    '000000010000' + // 41:53 strength_raw (10.000)
    'MG         ' + // 53:64 strength_unit
    '0001' + // 64:68 dosage_form_code
    'Tab                                               ' + // 68:118 dosage_form
    '00002800' + // 118:126 pack_size_raw (28.00)
    'OR' + // 126:128 route (OR = medicine)
    'C07AA05' + // 128:135 atc_mims_code
    'PROPRANOLOL                                       ' + // 135:185 atc_mims_desc
    'N' + // 185:186 generic_ind
    'N' + // 186:187 excl_flag
    '                                                  ' + // 187:237 excl_desc
    'S' + // 237:238 single_comb
    'EA' + // 238:240 pack_uom
    '20180101' + // 240:248 product_eff_date
    '                    ' + // 248:268 brand_code
    '3' + // 268:269 schedule
    '           ' + // 269:280 old_nappi_code
    '00000000' + // 280:288 old_nappi_eff
    '3000999001 ' + // 288:299 new_nappi_code (superseded replacement)
    '20220101' + // 299:307 new_nappi_eff
    '000000050.00' + // 307:319 price_lstx
    '20200101' + // 319:327 price_lstx_date
    '000000045.00' + // 327:339 price_hist1
    '20190101' + // 339:347 price_hist1_date
    '000000040.00' + // 347:359 price_hist2
    '20180101' + // 359:367 price_hist2_date
    '09876' + // 367:372 manuf_code
    'Novartis                                          ' + // 372:422 manuf_desc
    '000000000.000' + // 422:435 mmap_unit_price
    '000000000.000' + // 435:448 mmap_price
    '00000000' + // 448:456 mmap_price_date
    'N' + // 456:457 mmap_ind
    '20220101' + // 457:465 term_date
    'I' + // 465:466 status (I = inactive)
    'C07AA05' + // 466:473 who_atc_code
    'PROPRANOLOL                                                                     '; // 473:553 who_atc_desc

  // Sample non-medicine item (route == 'XX')
  const sampleNonMedicine =
    '080029001  ' + // 0:11 nappi_code (9 digits)
    'FOLLICULITUS FURUNCOLOSIS     ' + // 11:41 product_name
    '000000000000' + // 41:53 strength_raw (0)
    '           ' + // 53:64 strength_unit (empty)
    '0099' + // 64:68 dosage_form_code
    'Miscellaneous non-meds                            ' + // 68:118 dosage_form
    '00000100' + // 118:126 pack_size_raw (1.00)
    'XX' + // 126:128 route (XX = NON-MEDICINE)
    '       ' + // 128:135 atc_mims_code
    '                                                  ' + // 135:185 atc_mims_desc
    'N' + // 185:186 generic_ind
    'N' + // 186:187 excl_flag
    '                                                  ' + // 187:237 excl_desc
    'S' + // 237:238 single_comb
    'EA' + // 238:240 pack_uom
    '00000000' + // 240:248 product_eff_date
    '                    ' + // 248:268 brand_code
    ' ' + // 268:269 schedule
    '           ' + // 269:280 old_nappi_code
    '00000000' + // 280:288 old_nappi_eff
    '           ' + // 288:299 new_nappi_code
    '00000000' + // 299:307 new_nappi_eff
    '000000010.00' + // 307:319 price_lstx
    '20150101' + // 319:327 price_lstx_date
    '000000000.00' + // 327:339 price_hist1
    '00000000' + // 339:347 price_hist1_date
    '000000000.00' + // 347:359 price_hist2
    '00000000' + // 359:367 price_hist2_date
    '00001' + // 367:372 manuf_code
    'Mediscor Tariffs                                  ' + // 372:422 manuf_desc
    '000000000.000' + // 422:435 mmap_unit_price
    '000000000.000' + // 435:448 mmap_price
    '00000000' + // 448:456 mmap_price_date
    'N' + // 456:457 mmap_ind
    '00000000' + // 457:465 term_date
    'A' + // 465:466 status (active)
    '       ' + // 466:473 who_atc_code
    '                                                                                '; // 473:553 who_atc_desc

  it('should verify exact record length matches layout specification', () => {
    expect(sample9DigitMedicine.length).toBe(RECORD_LEN);
    expect(sample10DigitSuperseded.length).toBe(RECORD_LEN);
    expect(sampleNonMedicine.length).toBe(RECORD_LEN);
  });

  it('should parse 9-digit medicine preserving leading zero and pack suffix', () => {
    const warnings = new Map<string, number>();
    const res = NappiParser.parseLine(sample9DigitMedicine, warnings);

    expect(res).not.toBeNull();
    const prod = res!.product;

    expect(prod.nappi_code).toBe('080824002');
    expect(prod.product_code).toBe('080824');
    expect(prod.pack_code).toBe('002');
    expect(prod.product_name).toBe('PROPRANOLOL NAM 4MG/ML SUSP');
    expect(prod.strength).toBe('4');
    expect(prod.strength_unit).toBe('MG/ML');
    expect(prod.pack_size).toBe('100');
    expect(prod.pack_uom).toBe('ML');
    expect(prod.route).toBe('OR');
    expect(prod.is_medicine).toBe(true);
    expect(prod.is_active).toBe(true);
    expect(prod.schedule).toBe('4');
    expect(prod.row_hash).toHaveLength(32);
    expect(warnings.size).toBe(0);

    // Verify prices extracted
    expect(res!.prices.length).toBe(3); // lstx, hist1, hist2
    const lstx = res!.prices.find((p) => p.price_type === 'lstx');
    expect(lstx).toBeDefined();
    expect(lstx!.price).toBe('75.50');
    expect(lstx!.effective_date).toBe('2021-01-01');
  });

  it('should parse 10-digit superseded product and surface replacement code', () => {
    const res = NappiParser.parseLine(sample10DigitSuperseded);
    expect(res).not.toBeNull();
    const prod = res!.product;

    expect(prod.nappi_code).toBe('3000353001');
    expect(prod.product_code).toBe('3000353');
    expect(prod.pack_code).toBe('001');
    expect(prod.is_medicine).toBe(true);
    expect(prod.is_active).toBe(false); // status 'I' -> is_active false
    expect(prod.new_nappi_code).toBe('3000999001');
    expect(prod.new_nappi_eff).toBe('2022-01-01');
    expect(prod.term_date).toBe('2022-01-01');
  });

  it('should parse non-medicine items with route XX and flag is_medicine as false', () => {
    const res = NappiParser.parseLine(sampleNonMedicine);
    expect(res).not.toBeNull();
    const prod = res!.product;

    expect(prod.nappi_code).toBe('080029001');
    expect(prod.route).toBe('XX');
    expect(prod.is_medicine).toBe(false);
    expect(prod.is_active).toBe(true);
  });

  it('should handle layout warnings for corrupted or invalid lines', () => {
    const warnings = new Map<string, number>();

    // Line too short
    const shortLine = '080824002  SHORT LINE';
    const resShort = NappiParser.parseLine(shortLine, warnings);
    expect(resShort).not.toBeNull();
    expect(warnings.get(`line length != ${RECORD_LEN}`)).toBe(1);

    // Non-numeric NAPPI code
    const nonNumericLine = 'ABCDEFGHIJK' + ' '.repeat(542);
    const resNonNum = NappiParser.parseLine(nonNumericLine, warnings);
    expect(resNonNum).toBeNull();
    expect(warnings.get('skipped: NAPPI code not numeric')).toBe(1);
  });

  it('should generate valid escaped CSV row strings', () => {
    const res = NappiParser.parseLine(sample9DigitMedicine)!;
    const csvProduct = NappiParser.toProductCsvRow(res.product);
    const csvPrice = NappiParser.toPriceCsvRow(res.prices[0]);

    expect(csvProduct).toContain('080824002,080824,002');
    expect(csvPrice).toContain('080824002,lstx,75.50');
  });
});
