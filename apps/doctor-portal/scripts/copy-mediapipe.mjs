// Copies the self-hosted MediaPipe Tasks Vision runtime (wasm) and the selfie segmentation model into
// /public so the background-effects feature never depends on a third-party CDN. Runs before `dev` and
// `build`. The model lives in scripts/models (it is not shipped on npm).
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '..', 'public', 'mediapipe');
const root = join(base, 'tv-1.0.1'); // keep in step with WASM_BASE / MODEL_URL in src/lib/backgroundBlur.ts
const wasmDest = join(root, 'wasm');
const modelDest = join(root, 'models');

// Older layouts of this folder; drop them so stale files are never served.
for (const old of ['selfie', 'wasm', 'models']) rmSync(join(base, old), { recursive: true, force: true });

let src;
try {
  // The package's exports map hides package.json; resolve a wasm file it does export instead.
  src = dirname(require.resolve('@mediapipe/tasks-vision/vision_wasm_internal.wasm'));
} catch {
  console.warn('[mediapipe] @mediapipe/tasks-vision not installed; background effects will be unavailable');
  process.exit(0);
}

mkdirSync(wasmDest, { recursive: true });
mkdirSync(modelDest, { recursive: true });
const copy = (from, to) => {
  if (!existsSync(from)) {
    console.warn(`[mediapipe] missing ${from}`);
    return;
  }
  cpSync(from, to);
  chmodSync(to, 0o644);
};
for (const f of [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]) {
  copy(join(src, f), join(wasmDest, f));
}
copy(join(here, 'models', 'selfie_segmenter.tflite'), join(modelDest, 'selfie_segmenter.tflite'));
console.log('[mediapipe] copied tasks-vision runtime and selfie model to public/mediapipe');
