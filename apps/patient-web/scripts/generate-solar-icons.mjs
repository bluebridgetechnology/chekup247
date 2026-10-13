#!/usr/bin/env node
/**
 * Builds src/lib/solar-icons.json: only the Solar icons this app references.
 *
 * The patient app renders icons through @iconify/react. Without a local collection
 * Iconify fetches each icon from the public api.iconify.design at runtime, which fails
 * offline (PWA) or when that service is blocked. Bundling the full Solar set is ~11 MB,
 * so this keeps just the icons that are used (a few tens of KB).
 *
 * Re-run after adding a new icon name:  npm run icons:build --workspace=@chekup247/patient-web
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const solar = JSON.parse(fs.readFileSync(require.resolve('@iconify-json/solar/icons.json'), 'utf8'));

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(p);
  }
})(path.join(root, 'src'));

// Any quoted string that looks like a Solar icon name (name="x-linear", icon: 'x-bold', 'solar:x-linear', ...)
const re = /['"`](?:solar:)?([a-z0-9]+(?:-[a-z0-9]+)*-(?:linear|bold|bold-duotone|broken|line-duotone|outline))['"`]/g;
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(src))) used.add(m[1]);
}

const icons = {};
const aliases = {};
const unknown = [];
for (const name of [...used].sort()) {
  if (solar.icons[name]) icons[name] = solar.icons[name];
  else if (solar.aliases?.[name]) {
    const alias = solar.aliases[name];
    aliases[name] = alias;
    if (solar.icons[alias.parent]) icons[alias.parent] = solar.icons[alias.parent];
  } else unknown.push(name);
}

const out = { prefix: 'solar', width: solar.width ?? 24, height: solar.height ?? 24, icons, ...(Object.keys(aliases).length ? { aliases } : {}) };
const target = path.join(root, 'src', 'lib', 'solar-icons.json');
fs.writeFileSync(target, JSON.stringify(out) + '\n');
console.log(`solar-icons.json: ${Object.keys(icons).length} icons (${(fs.statSync(target).size / 1024).toFixed(1)} KB)` + (unknown.length ? `; not in Solar set (will load online): ${unknown.join(', ')}` : ''));
