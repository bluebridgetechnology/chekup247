const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const directories = [
  path.join(__dirname, '../apps/patient-web/public/images'),
  path.join(__dirname, '../apps/doctor-portal/public/images'),
];

async function optimizeDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);

    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const origBuffer = fs.readFileSync(filePath);
      const origSize = origBuffer.length;
      const webpPath = path.join(dir, `${baseName}.webp`);

      try {
        // 1. Generate WebP if not exists or update
        const webpBuf = await sharp(origBuffer)
          .webp({ quality: 82, effort: 6 })
          .toBuffer();
        fs.writeFileSync(webpPath, webpBuf);
        console.log(`[WEBP] ${file} (${Math.round(origSize / 1024)} KB) -> ${baseName}.webp (${Math.round(webpBuf.length / 1024)} KB) [Saved ${Math.round((1 - webpBuf.length / origSize) * 100)}%]`);

        // 2. Compress original file in-place
        let compressedBuf;
        if (ext === '.png') {
          compressedBuf = await sharp(origBuffer)
            .png({ compressionLevel: 9, quality: 85, effort: 8 })
            .toBuffer();
        } else {
          compressedBuf = await sharp(origBuffer)
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
        }

        if (compressedBuf.length < origSize) {
          fs.writeFileSync(filePath, compressedBuf);
          console.log(`[OPTIMIZED] ${file}: ${Math.round(origSize / 1024)} KB -> ${Math.round(compressedBuf.length / 1024)} KB [Saved ${Math.round((1 - compressedBuf.length / origSize) * 100)}%]`);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
  }
}

async function main() {
  console.log('Starting image optimization...');
  for (const dir of directories) {
    console.log(`\nOptimizing directory: ${dir}`);
    await optimizeDirectory(dir);
  }
  console.log('\nImage optimization complete!');
}

main();
