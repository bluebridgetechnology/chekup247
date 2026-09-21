const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../apps/patient-web/node_modules/sharp'));

const patientIconsDir = path.join(__dirname, '../apps/patient-web/public/icons');
const doctorIconsDir = path.join(__dirname, '../apps/doctor-portal/public/icons');

[patientIconsDir, doctorIconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Patient SVG (Gold Cross on Dark Chocolate)
const patientSvg = (padding = 0.15) => `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="110" fill="#2A170F"/>
  <defs>
    <linearGradient id="goldGrad" x1="60" y1="40" x2="450" y2="470" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ECC27E"/>
      <stop offset="50%" stop-color="#DFAB62"/>
      <stop offset="100%" stop-color="#C9944A"/>
    </linearGradient>
    <clipPath id="crossClip">
      <rect x="186" y="56" width="140" height="400" rx="70" />
      <rect x="56" y="186" width="400" height="140" rx="70" />
    </clipPath>
    <filter id="shadow" x="0" y="0" width="512" height="512" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <g filter="url(#shadow)">
    <g clip-path="url(#crossClip)">
      <rect x="40" y="40" width="432" height="432" fill="url(#goldGrad)"/>
      <line x1="100" y1="412" x2="412" y2="100" stroke="#2A170F" stroke-width="26" stroke-linecap="round"/>
      <path d="M150 362L362 150" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round" stroke-opacity="0.85"/>
      <ellipse cx="300" cy="210" rx="60" ry="30" transform="rotate(-45 300 210)" fill="#FFFFFF" fill-opacity="0.3"/>
    </g>
  </g>
</svg>
`;

// Patient Maskable SVG (Full-bleed safe zone, 80% safe circle)
const patientMaskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2A170F"/>
  <defs>
    <linearGradient id="goldGradM" x1="100" y1="80" x2="410" y2="430" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ECC27E"/>
      <stop offset="50%" stop-color="#DFAB62"/>
      <stop offset="100%" stop-color="#C9944A"/>
    </linearGradient>
    <clipPath id="crossClipM">
      <rect x="206" y="96" width="100" height="320" rx="50" />
      <rect x="96" y="206" width="320" height="100" rx="50" />
    </clipPath>
  </defs>

  <g clip-path="url(#crossClipM)">
    <rect x="80" y="80" width="352" height="352" fill="url(#goldGradM)"/>
    <line x1="130" y1="382" x2="382" y2="130" stroke="#2A170F" stroke-width="20" stroke-linecap="round"/>
    <path d="M170 342L342 170" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-opacity="0.85"/>
    <ellipse cx="290" cy="220" rx="45" ry="22" transform="rotate(-45 290 220)" fill="#FFFFFF" fill-opacity="0.3"/>
  </g>
</svg>
`;

// Doctor SVG (ChekUp Cross with Clinical Teal & Doctor "DOC" emblem badge)
const doctorSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="110" fill="#1E100A"/>
  <defs>
    <linearGradient id="tealGrad" x1="60" y1="40" x2="450" y2="470" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2BAEA1"/>
      <stop offset="50%" stop-color="#0E9384"/>
      <stop offset="100%" stop-color="#0B6259"/>
    </linearGradient>
    <clipPath id="crossClipDoc">
      <rect x="186" y="56" width="140" height="400" rx="70" />
      <rect x="56" y="186" width="400" height="140" rx="70" />
    </clipPath>
    <filter id="docShadow" x="0" y="0" width="512" height="512" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <g filter="url(#docShadow)">
    <g clip-path="url(#crossClipDoc)">
      <rect x="40" y="40" width="432" height="432" fill="url(#tealGrad)"/>
      <line x1="100" y1="412" x2="412" y2="100" stroke="#1E100A" stroke-width="26" stroke-linecap="round"/>
      <path d="M150 362L362 150" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round" stroke-opacity="0.85"/>
      <ellipse cx="300" cy="210" rx="60" ry="30" transform="rotate(-45 300 210)" fill="#FFFFFF" fill-opacity="0.3"/>
    </g>
  </g>

  <!-- Clinical Doctor Badge on bottom-right -->
  <circle cx="390" cy="390" r="82" fill="#0E9384" stroke="#FAF6EE" stroke-width="12"/>
  <text x="390" y="403" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#FAF6EE" letter-spacing="1">DOC</text>
</svg>
`;

// Doctor Maskable SVG (Full-bleed safe zone)
const doctorMaskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1E100A"/>
  <defs>
    <linearGradient id="tealGradM" x1="100" y1="80" x2="410" y2="430" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2BAEA1"/>
      <stop offset="50%" stop-color="#0E9384"/>
      <stop offset="100%" stop-color="#0B6259"/>
    </linearGradient>
    <clipPath id="crossClipDocM">
      <rect x="206" y="96" width="100" height="320" rx="50" />
      <rect x="96" y="206" width="320" height="100" rx="50" />
    </clipPath>
  </defs>

  <g clip-path="url(#crossClipDocM)">
    <rect x="80" y="80" width="352" height="352" fill="url(#tealGradM)"/>
    <line x1="130" y1="382" x2="382" y2="130" stroke="#1E100A" stroke-width="20" stroke-linecap="round"/>
    <path d="M170 342L342 170" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-opacity="0.85"/>
    <ellipse cx="290" cy="220" rx="45" ry="22" transform="rotate(-45 290 220)" fill="#FFFFFF" fill-opacity="0.3"/>
  </g>

  <!-- Doctor Badge inside safe zone -->
  <circle cx="360" cy="360" r="54" fill="#0E9384" stroke="#FAF6EE" stroke-width="8"/>
  <text x="360" y="371" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#FAF6EE" letter-spacing="1">DOC</text>
</svg>
`;

async function generate() {
  console.log('Generating PWA icons for Patient Web...');
  const patientSvgBuf = Buffer.from(patientSvg());
  const patientMaskableBuf = Buffer.from(patientMaskableSvg);

  await sharp(patientSvgBuf).resize(512, 512).png().toFile(path.join(patientIconsDir, 'icon-512x512.png'));
  await sharp(patientSvgBuf).resize(192, 192).png().toFile(path.join(patientIconsDir, 'icon-192x192.png'));
  await sharp(patientMaskableBuf).resize(512, 512).png().toFile(path.join(patientIconsDir, 'icon-maskable-512x512.png'));
  await sharp(patientMaskableBuf).resize(192, 192).png().toFile(path.join(patientIconsDir, 'icon-maskable-192x192.png'));
  await sharp(patientSvgBuf).resize(180, 180).png().toFile(path.join(patientIconsDir, 'apple-touch-icon.png'));
  await sharp(patientSvgBuf).resize(32, 32).png().toFile(path.join(patientIconsDir, 'favicon-32x32.png'));

  console.log('Generating PWA icons for Doctor Portal...');
  const docSvgBuf = Buffer.from(doctorSvg);
  const docMaskableBuf = Buffer.from(doctorMaskableSvg);

  await sharp(docSvgBuf).resize(512, 512).png().toFile(path.join(doctorIconsDir, 'icon-512x512.png'));
  await sharp(docSvgBuf).resize(192, 192).png().toFile(path.join(doctorIconsDir, 'icon-192x192.png'));
  await sharp(docMaskableBuf).resize(512, 512).png().toFile(path.join(doctorIconsDir, 'icon-maskable-512x512.png'));
  await sharp(docMaskableBuf).resize(192, 192).png().toFile(path.join(doctorIconsDir, 'icon-maskable-192x192.png'));
  await sharp(docSvgBuf).resize(180, 180).png().toFile(path.join(doctorIconsDir, 'apple-touch-icon.png'));
  await sharp(docSvgBuf).resize(32, 32).png().toFile(path.join(doctorIconsDir, 'favicon-32x32.png'));

  console.log('All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
