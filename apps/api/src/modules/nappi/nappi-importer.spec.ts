import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NappiImporterService } from './nappi-importer.service';

describe('NappiImporterService (Integration)', () => {
  let service: NappiImporterService;
  let tempDir: string;
  let sampleFilePath: string;
  let truncatedFilePath: string;

  jest.setTimeout(30000);

  // Sample records (553 chars each)
  const sampleLines = [
    // 1. Propranolol (medicine)
    '080824002  ' +
      'PROPRANOLOL NAM 4MG/ML SUSP   ' +
      '000000004000' +
      'MG/ML      ' +
      '0244' +
      'Suspension                                        ' +
      '00010000' +
      'OR' +
      'C07AA05' +
      'PROPRANOLOL                                       ' +
      'N' +
      'N' +
      '                                                  ' +
      'S' +
      'ML' +
      '20180401' +
      '                    ' +
      '4' +
      '           ' +
      '00000000' +
      '           ' +
      '00000000' +
      '000000075.50' +
      '20210101' +
      '000000070.00' +
      '20200101' +
      '000000065.00' +
      '20190101' +
      '01234' +
      'Intersana                                         ' +
      '000000000.000' +
      '000000000.000' +
      '00000000' +
      'N' +
      '00000000' +
      'A' +
      'C07AA05' +
      'PROPRANOLOL                                                                     ',

    // 2. Terbinafine (medicine)
    '087250002  ' +
      'TERBINAFINE NAM 12.5MG/ML SUSP' +
      '000000012500' +
      'MG/ML      ' +
      '0244' +
      'Suspension                                        ' +
      '00010000' +
      'OR' +
      'D01AE15' +
      'TERBINAFINE                                       ' +
      'N' +
      'N' +
      '                                                  ' +
      'S' +
      'ML' +
      '20180401' +
      '                    ' +
      '4' +
      '           ' +
      '00000000' +
      '           ' +
      '00000000' +
      '000000120.00' +
      '20210101' +
      '000000110.00' +
      '20200101' +
      '000000100.00' +
      '20190101' +
      '01234' +
      'Intersana                                         ' +
      '000000000.000' +
      '000000000.000' +
      '00000000' +
      'N' +
      '00000000' +
      'A' +
      'D01AE15' +
      'TERBINAFINE                                                                     ',

    // 3. Folliculitus (non-medicine item)
    '080029001  ' +
      'FOLLICULITUS FURUNCOLOSIS     ' +
      '000000000000' +
      '           ' +
      '0099' +
      'Miscellaneous non-meds                            ' +
      '00000100' +
      'XX' +
      '       ' +
      '                                                  ' +
      'N' +
      'N' +
      '                                                  ' +
      'S' +
      'EA' +
      '00000000' +
      '                    ' +
      ' ' +
      '           ' +
      '00000000' +
      '           ' +
      '00000000' +
      '000000010.00' +
      '20150101' +
      '000000000.00' +
      '00000000' +
      '000000000.00' +
      '00000000' +
      '00001' +
      'Mediscor Tariffs                                  ' +
      '000000000.000' +
      '000000000.000' +
      '00000000' +
      'N' +
      '00000000' +
      'A' +
      '       ' +
      '                                                                                ',

    // 4. Superseded product
    '3000353001 ' +
      'PROPRANOLOL NAM ONLY 10MG TABS' +
      '000000010000' +
      'MG         ' +
      '0001' +
      'Tab                                               ' +
      '00002800' +
      'OR' +
      'C07AA05' +
      'PROPRANOLOL                                       ' +
      'N' +
      'N' +
      '                                                  ' +
      'S' +
      'EA' +
      '20180101' +
      '                    ' +
      '3' +
      '           ' +
      '00000000' +
      '080824002  ' +
      '20220101' +
      '000000050.00' +
      '20200101' +
      '000000045.00' +
      '20190101' +
      '000000040.00' +
      '20180101' +
      '09876' +
      'Novartis                                          ' +
      '000000000.000' +
      '000000000.000' +
      '00000000' +
      'N' +
      '20220101' +
      'I' +
      'C07AA05' +
      'PROPRANOLOL                                                                     ',
  ];

  beforeAll(async () => {
    service = new NappiImporterService();
    const pool = await service.getPool();
    await pool.query('TRUNCATE nappi_prices CASCADE; TRUNCATE nappi_products CASCADE;');

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nappi-test-'));
    sampleFilePath = path.join(tempDir, 'sample_nappi.txt');
    fs.writeFileSync(sampleFilePath, sampleLines.join('\n') + '\n', 'latin1');

    truncatedFilePath = path.join(tempDir, 'truncated_nappi.txt');
    // 1 line vs 4 lines in DB (< 50%)
    fs.writeFileSync(truncatedFilePath, sampleLines[0] + '\n', 'latin1');
  });

  afterAll(async () => {
    await service.onModuleDestroy();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('should import sample records and return accurate summary', async () => {
    const summary = await service.importFile(sampleFilePath, {
      abortOnTruncation: false,
    });

    expect(summary.rowsRead).toBe(4);
    expect(summary.inserted).toBe(4);
    expect(summary.updated).toBe(0);
    expect(summary.retired).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.durationSeconds).toBeGreaterThan(0);
  });

  it('should be completely idempotent when running the same file twice', async () => {
    const secondSummary = await service.importFile(sampleFilePath, {
      abortOnTruncation: false,
    });

    expect(secondSummary.rowsRead).toBe(4);
    expect(secondSummary.inserted).toBe(0);
    expect(secondSummary.updated).toBe(0);
    expect(secondSummary.retired).toBe(0);
    expect(secondSummary.skipped).toBe(4);
    expect(secondSummary.isIdempotent).toBe(true);
  });

  it('should abort and rollback if staged file has fewer than half existing rows', async () => {
    await expect(
      service.importFile(truncatedFilePath, { abortOnTruncation: true }),
    ).rejects.toThrow(/Staged file has under half the existing rows/);
  });
});
