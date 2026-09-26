import * as path from 'path';
import * as fs from 'fs';
import { NappiImporterService } from '../modules/nappi/nappi-importer.service';

async function runCli() {
  const args = process.argv.slice(2);
  const inputArg = args[0];

  let resolvedPath: string | null = null;

  if (inputArg) {
    const candidates = [
      path.resolve(process.cwd(), inputArg),
      path.resolve(process.cwd(), '../../', inputArg),
      path.resolve(__dirname, '../../../../', inputArg),
    ];
    resolvedPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];
  } else {
    const defaultCandidates = [
      path.resolve(process.cwd(), 'nappi/mhsprods.txt'),
      path.resolve(process.cwd(), '../../nappi/mhsprods.txt'),
      path.resolve(__dirname, '../../../../nappi/mhsprods.txt'),
    ];
    resolvedPath = defaultCandidates.find((c) => fs.existsSync(c)) || defaultCandidates[0];
  }

  console.log(`[NAPPI-CLI] Resolved NAPPI source file: ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`[NAPPI-CLI] Error: File does not exist at: ${resolvedPath}`);
    process.exit(1);
  }

  const importer = new NappiImporterService();

  try {
    const summary = await importer.importFile(resolvedPath, {
      logger: (msg: string) => console.log(`[NAPPI-CLI] ${msg}`),
    });

    console.log('[NAPPI-CLI] Import completed successfully.');
    await importer.onModuleDestroy();
    process.exit(0);
  } catch (err: any) {
    console.error('[NAPPI-CLI] Import failed with error:', err.message);
    await importer.onModuleDestroy();
    process.exit(1);
  }
}

runCli();
