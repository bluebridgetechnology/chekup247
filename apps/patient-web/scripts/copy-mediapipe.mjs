// Copies the self-hosted MediaPipe selfie-segmentation runtime (wasm + model) into /public so the
// background-blur feature never depends on a third-party CDN. Runs before `dev` and `build`.
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, '..', 'public', 'mediapipe', 'selfie');

let src;
try {
  src = dirname(require.resolve('@mediapipe/selfie_segmentation/package.json'));
} catch {
  console.warn('[mediapipe] @mediapipe/selfie_segmentation not installed; background blur will be unavailable');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const f of [
  'selfie_segmentation.js',
  'selfie_segmentation.binarypb',
  'selfie_segmentation.tflite',
  'selfie_segmentation_landscape.tflite',
  'selfie_segmentation_solution_simd_wasm_bin.js',
  'selfie_segmentation_solution_simd_wasm_bin.wasm',
  'selfie_segmentation_solution_simd_wasm_bin.data',
  'selfie_segmentation_solution_wasm_bin.js',
  'selfie_segmentation_solution_wasm_bin.wasm',
]) {
  const from = join(src, f);
  if (existsSync(from)) {
    cpSync(from, join(dest, f));
    chmodSync(join(dest, f), 0o644);
  }
}
console.log('[mediapipe] copied selfie segmentation runtime to public/mediapipe/selfie');
