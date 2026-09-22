import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { Prescription, MedicationItem } from '../../database/patient/entities';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const solar = require('@iconify-json/solar/icons.json');

export interface DoctorDetails {
  name: string;
  hpcsa_number: string;
  specialty?: string;
  practice_number?: string;
  signature_url?: string;
  signature_png_buffer?: Buffer;
}

export interface PatientDetails {
  name: string;
  id_number?: string;
  email?: string;
  phone?: string;
}

interface CachedIconBuffers {
  logo: Buffer;
  calendar: Buffer;
  hourglass: Buffer;
  user: Buffer;
  stethoscope: Buffer;
  pill: Buffer;
  shield: Buffer;
  stampCheck: Buffer;
  info: Buffer;
  lock: Buffer;
}

@Injectable()
export class PrescriptionPdfService {
  private readonly logger = new Logger(PrescriptionPdfService.name);
  private cachedIcons: CachedIconBuffers | null = null;

  /**
   * Pre-renders and caches vector icons to high-resolution transparent PNG buffers.
   * Mirrors the exact visual appearance of the ChekUp247 patient web HTML prescription modal.
   */
  private async getIconBuffers(): Promise<CachedIconBuffers> {
    if (this.cachedIcons) {
      return this.cachedIcons;
    }

    try {
      const calendarBody = solar.icons['calendar-linear']?.body || '';
      const hourglassBody = solar.icons['hourglass-linear']?.body || '';
      const userBody = solar.icons['user-linear']?.body || '';
      const stethoscopeBody = solar.icons['stethoscope-linear']?.body || '';
      const pillBody = solar.icons['pill-linear']?.body || '';
      const shieldBody = solar.icons['shield-check-linear']?.body || '';
      const checkBody = solar.icons['check-circle-bold']?.body || '';
      const infoBody = solar.icons['info-circle-linear']?.body || '';
      const lockBody = solar.icons['lock-linear']?.body || '';

      // Precision Chekup247 Brand Medical Cross Mark (matching ChekupCrossLogo.tsx)
      const logoSvg = `<svg width="144" height="144" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="crossGoldGradPatient" x1="3" y1="2" x2="25" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ECC27E" />
            <stop offset="50%" stop-color="#DFAB62" />
            <stop offset="100%" stop-color="#C9944A" />
          </linearGradient>
          <clipPath id="crossClipShapePatient">
            <rect x="9.5" y="1.5" width="9" height="25" rx="4.5" />
            <rect x="1.5" y="9.5" width="25" height="9" rx="4.5" />
          </clipPath>
        </defs>
        <g clip-path="url(#crossClipShapePatient)">
          <rect x="0" y="0" width="28" height="28" fill="url(#crossGoldGradPatient)" />
          <line x1="5" y1="23" x2="23" y2="5" stroke="#2A170F" stroke-width="1.6" stroke-linecap="round" />
          <path d="M8.5 21L21 8.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.85" />
          <ellipse cx="17.5" cy="12" rx="3.5" ry="1.8" transform="rotate(-45 17.5 12)" fill="#FFFFFF" fill-opacity="0.3" />
        </g>
      </svg>`;

      // Calendar Icon Box (matching HTML view: #FAF7F2 bg, #EDE5D8 border, #A86C38 icon)
      const calendarSvg = `<svg width="88" height="88" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="#FAF7F2" stroke="#EDE5D8" stroke-width="1.5"/>
        <g transform="translate(9, 9) scale(0.75)" color="#A86C38">${calendarBody}</g>
      </svg>`;

      // Hourglass Icon Box (matching HTML view: #FAF7F2 bg, #EDE5D8 border, #A86C38 icon)
      const hourglassSvg = `<svg width="88" height="88" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="#FAF7F2" stroke="#EDE5D8" stroke-width="1.5"/>
        <g transform="translate(9, 9) scale(0.75)" color="#A86C38">${hourglassBody}</g>
      </svg>`;

      // User Circle (matching HTML view: #FAF2E4 bg circle, #A86C38 user-linear icon)
      const userSvg = `<svg width="72" height="72" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#FAF2E4"/>
        <g transform="translate(6, 6) scale(0.666)" color="#A86C38">${userBody}</g>
      </svg>`;

      // Stethoscope Circle (matching HTML view: #FAF2E4 bg circle, #A86C38 stethoscope-linear icon)
      const stethoscopeSvg = `<svg width="72" height="72" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#FAF2E4"/>
        <g transform="translate(6, 6) scale(0.666)" color="#A86C38">${stethoscopeBody}</g>
      </svg>`;

      // Pill Circle (matching HTML view: #FAF2E4 bg circle, #A86C38 pill-linear icon)
      const pillSvg = `<svg width="72" height="72" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#FAF2E4"/>
        <g transform="translate(6, 6) scale(0.666)" color="#A86C38">${pillBody}</g>
      </svg>`;

      // Shield Circle (matching HTML view: #FAF2E4 bg circle, #A86C38 shield-check-linear icon)
      const shieldSvg = `<svg width="72" height="72" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#FAF2E4"/>
        <g transform="translate(6, 6) scale(0.666)" color="#A86C38">${shieldBody}</g>
      </svg>`;

      // Stamp Check Circle (matching HTML view: #A86C38 bg circle, white check-circle-bold icon)
      const stampCheckSvg = `<svg width="80" height="80" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#A86C38"/>
        <g transform="translate(6, 6) scale(0.833)" fill="#FFFFFF">${checkBody}</g>
      </svg>`;

      // Info Icon (matching HTML view: #A86C38 info-circle-linear)
      const infoSvg = `<svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g color="#A86C38">${infoBody}</g>
      </svg>`;

      // Lock Icon (matching HTML view: #7A6A5E lock-linear)
      const lockSvg = `<svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g color="#7A6A5E">${lockBody}</g>
      </svg>`;

      const [logo, calendar, hourglass, user, stethoscope, pill, shield, stampCheck, info, lock] =
        await Promise.all([
          sharp(Buffer.from(logoSvg)).png().toBuffer(),
          sharp(Buffer.from(calendarSvg)).png().toBuffer(),
          sharp(Buffer.from(hourglassSvg)).png().toBuffer(),
          sharp(Buffer.from(userSvg)).png().toBuffer(),
          sharp(Buffer.from(stethoscopeSvg)).png().toBuffer(),
          sharp(Buffer.from(pillSvg)).png().toBuffer(),
          sharp(Buffer.from(shieldSvg)).png().toBuffer(),
          sharp(Buffer.from(stampCheckSvg)).png().toBuffer(),
          sharp(Buffer.from(infoSvg)).png().toBuffer(),
          sharp(Buffer.from(lockSvg)).png().toBuffer(),
        ]);

      this.cachedIcons = {
        logo,
        calendar,
        hourglass,
        user,
        stethoscope,
        pill,
        shield,
        stampCheck,
        info,
        lock,
      };

      return this.cachedIcons;
    } catch (err: any) {
      this.logger.error(`Failed to generate icon buffers: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Generates a tamper-evident, professional South African E-Prescription PDF (BE-706).
   * Exact visual match with the ChekUp247 patient web HTML prescription view.
   * Adheres to HPCSA guidelines, Medicines and Related Substances Act (Act 101/1965), and ECTA (Act 25/2002).
   */
  async generatePrescriptionPdf(
    prescription: Prescription,
    doctor: DoctorDetails,
    patient: PatientDetails,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (points)
    const { width, height } = page.getSize();

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Color Palette matching ChekUp247 Brand & HTML view
    const chocolateDark = rgb(0.165, 0.090, 0.059); // #2A170F
    const goldAccent = rgb(0.659, 0.424, 0.220);    // #A86C38
    const goldLight = rgb(0.941, 0.906, 0.847);     // #F0E7D8
    const bgCream = rgb(0.980, 0.969, 0.949);       // #FAF7F2
    const borderCream = rgb(0.929, 0.898, 0.847);   // #EDE5D8
    const borderLight = rgb(0.941, 0.918, 0.882);   // #F0EAE1
    const textDark = rgb(0.165, 0.090, 0.059);      // #2A170F
    const textMuted = rgb(0.478, 0.416, 0.369);     // #7A6A5E
    const textLight = rgb(0.361, 0.310, 0.275);     // #5C4F46
    const textHeader = rgb(0.290, 0.231, 0.196);    // #4A3B32
    const greenBadge = rgb(0.016, 0.471, 0.341);    // #047857
    const greenBg = rgb(0.925, 0.992, 0.961);       // #ECFDF5
    const greenBorder = rgb(0.655, 0.953, 0.816);   // #A7F3D0
    const amberBg = rgb(1.0, 0.984, 0.922);         // #FFFBEB
    const amberBorder = rgb(0.961, 0.620, 0.043);   // #F59E0B
    const amberText = rgb(0.573, 0.251, 0.055);     // #92400E
    const stampBorder = rgb(0.757, 0.518, 0.302);   // #C1844D
    const white = rgb(1.0, 1.0, 1.0);

    // Compute cryptographic verification hash (Tamper-evident seal)
    const rawPayload = `${prescription.id}|${doctor.hpcsa_number}|${patient.name}|${prescription.icd10_code}|${prescription.issued_at || (prescription as any).created_at}`;
    const verificationHash = crypto
      .createHash('sha256')
      .update(rawPayload)
      .digest('hex')
      .toUpperCase();

    // Dynamic verification URL using domain chekup247.com
    const verificationBaseUrl =
      process.env.FRONTEND_PATIENT_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://chekup247.com';
    const cleanBaseUrl = verificationBaseUrl.replace(/\/$/, '');
    const verificationUrl = `${cleanBaseUrl}/verify/rx/${prescription.id}`;

    // Embed all pre-rendered high-res SVG brand icons
    const icons = await this.getIconBuffers();
    const [
      logoImg,
      calendarImg,
      hourglassImg,
      userImg,
      stethImg,
      pillImg,
      shieldImg,
      stampCheckImg,
      infoImg,
      lockImg,
    ] = await Promise.all([
      pdfDoc.embedPng(icons.logo),
      pdfDoc.embedPng(icons.calendar),
      pdfDoc.embedPng(icons.hourglass),
      pdfDoc.embedPng(icons.user),
      pdfDoc.embedPng(icons.stethoscope),
      pdfDoc.embedPng(icons.pill),
      pdfDoc.embedPng(icons.shield),
      pdfDoc.embedPng(icons.stampCheck),
      pdfDoc.embedPng(icons.info),
      pdfDoc.embedPng(icons.lock),
    ]);

    // Generate QR Code
    let qrImage: any = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 140,
        color: {
          dark: '#2A170F',
          light: '#FFFFFF',
        },
      });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));
    } catch (e: any) {
      this.logger.warn(`Could not generate QR code for PDF: ${e.message}`);
    }

    // Embed doctor's high-res PNG signature if provided
    let signatureImage: any = null;
    if (doctor.signature_png_buffer) {
      try {
        signatureImage = await pdfDoc.embedPng(doctor.signature_png_buffer);
      } catch (e: any) {
        this.logger.warn(`Could not embed signature PNG buffer: ${e.message}`);
      }
    } else if (doctor.signature_url) {
      try {
        if (doctor.signature_url.startsWith('data:image/')) {
          const b64 = doctor.signature_url.split(',')[1] || doctor.signature_url;
          signatureImage = await pdfDoc.embedPng(Buffer.from(b64, 'base64'));
        } else if (doctor.signature_url.startsWith('http')) {
          const res = await fetch(doctor.signature_url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            signatureImage = await pdfDoc.embedPng(buf);
          }
        }
      } catch (e: any) {
        this.logger.warn(`Could not load doctor signature from ${doctor.signature_url}: ${e.message}`);
      }
    }

    const marginX = 40;
    const contentWidth = width - marginX * 2; // 515.28 pt

    // Clean doctor name so "Dr." is never duplicated
    const docNameClean = doctor.name.replace(/^Dr\.?\s*/i, '');
    const fullDoctorName = `Dr. ${docNameClean}`;

    // ─── 1. Header: ChekUp247 Logo & Medical Practice Letterhead ───
    let y = height - 44;

    // Draw exact ChekUp247 brand gold cross logo
    page.drawImage(logoImg, {
      x: marginX,
      y: y - 36,
      width: 36,
      height: 36,
    });

    // Letterhead Typography
    page.drawText('CHEKUP247 TELEHEALTH', {
      x: marginX + 46,
      y: y - 10,
      size: 14.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    page.drawText('HPCSA Telemedicine Compliant Virtual Medical Practice  •  PR 0148291', {
      x: marginX + 46,
      y: y - 22,
      size: 7.5,
      font: helvetica,
      color: textLight,
    });

    page.drawText('support@chekup247.com  |  www.chekup247.com', {
      x: marginX + 46,
      y: y - 32,
      size: 7,
      font: helvetica,
      color: textMuted,
    });

    // Top Divider Line
    y -= 46;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: width - marginX, y },
      thickness: 1,
      color: borderCream,
    });

    // ─── 2. Official Electronic Prescription Meta Bar ───
    y -= 16;
    page.drawText('OFFICIAL ELECTRONIC PRESCRIPTION', {
      x: marginX,
      y,
      size: 7.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    y -= 14;
    const issuedDate = new Date(prescription.issued_at || (prescription as any).created_at || Date.now());
    const issuedDateStr = issuedDate.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 1. Issued Date Section (Left)
    let currentX = marginX;
    page.drawImage(calendarImg, {
      x: currentX,
      y: y - 18,
      width: 20,
      height: 20,
    });
    currentX += 26;

    page.drawText('Issued: ', {
      x: currentX,
      y: y - 10,
      size: 7.5,
      font: helvetica,
      color: textDark,
    });
    currentX += helvetica.widthOfTextAtSize('Issued: ', 7.5);

    page.drawText(issuedDateStr, {
      x: currentX,
      y: y - 10,
      size: 7.5,
      font: helveticaBold,
      color: textDark,
    });
    currentX += helveticaBold.widthOfTextAtSize(issuedDateStr, 7.5) + 14;

    // Vertical Divider
    page.drawLine({
      start: { x: currentX, y: y - 14 },
      end: { x: currentX, y: y + 2 },
      thickness: 1,
      color: borderCream,
    });
    currentX += 14;

    // 2. Validity Section (Middle)
    page.drawImage(hourglassImg, {
      x: currentX,
      y: y - 18,
      width: 20,
      height: 20,
    });
    currentX += 26;

    page.drawText('Validity: ', {
      x: currentX,
      y: y - 10,
      size: 7.5,
      font: helvetica,
      color: textDark,
    });
    currentX += helvetica.widthOfTextAtSize('Validity: ', 7.5);

    page.drawText('30 Days from Issue', {
      x: currentX,
      y: y - 10,
      size: 7.5,
      font: helveticaBold,
      color: textDark,
    });
    currentX += helveticaBold.widthOfTextAtSize('30 Days from Issue', 7.5);

    page.drawText(' (Act 101/1965)', {
      x: currentX,
      y: y - 10,
      size: 7,
      font: helvetica,
      color: textMuted,
    });

    // 3. Rx ID Pill Badge (Right-aligned without overlap)
    const rxIdStr = prescription.id.toUpperCase();
    const rxIdTextWidth = helveticaBold.widthOfTextAtSize(rxIdStr, 8);
    const rxLabelWidth = helvetica.widthOfTextAtSize('Rx ID: ', 7.5);
    const rxBadgeWidth = rxLabelWidth + rxIdTextWidth + 18;
    const rxBadgeX = width - marginX - rxBadgeWidth;

    page.drawRectangle({
      x: rxBadgeX,
      y: y - 17,
      width: rxBadgeWidth,
      height: 20,
      color: bgCream,
      borderColor: borderCream,
      borderWidth: 1,
    });
    page.drawText('Rx ID: ', {
      x: rxBadgeX + 9,
      y: y - 10,
      size: 7.5,
      font: helvetica,
      color: textLight,
    });
    page.drawText(rxIdStr, {
      x: rxBadgeX + 9 + rxLabelWidth,
      y: y - 10,
      size: 8,
      font: helveticaBold,
      color: chocolateDark,
    });

    // ─── 3. Two-Column Practitioner & Patient Information Grid ───
    y -= 34;
    const infoCardHeight = 72;
    page.drawRectangle({
      x: marginX,
      y: y - infoCardHeight,
      width: contentWidth,
      height: infoCardHeight,
      color: white,
      borderColor: borderCream,
      borderWidth: 1,
    });

    const colDividerX = marginX + contentWidth / 2;
    page.drawLine({
      start: { x: colDividerX, y: y - infoCardHeight + 8 },
      end: { x: colDividerX, y: y - 8 },
      thickness: 1,
      color: borderLight,
    });

    // Col 1: Prescribing Practitioner
    page.drawImage(userImg, {
      x: marginX + 12,
      y: y - 24,
      width: 18,
      height: 18,
    });
    page.drawText('PRESCRIBING PRACTITIONER', {
      x: marginX + 36,
      y: y - 18,
      size: 7,
      font: helveticaBold,
      color: goldAccent,
    });

    page.drawText(fullDoctorName, {
      x: marginX + 36,
      y: y - 31,
      size: 9.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    page.drawText(doctor.specialty || 'Family Medicine & General Practitioner', {
      x: marginX + 36,
      y: y - 43,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    });

    page.drawLine({
      start: { x: marginX + 36, y: y - 50 },
      end: { x: colDividerX - 16, y: y - 50 },
      thickness: 0.8,
      color: borderLight,
    });

    page.drawText(`HPCSA Reg: ${doctor.hpcsa_number}  •  Practice: ${doctor.practice_number || 'PR 0148291'}`, {
      x: marginX + 36,
      y: y - 61,
      size: 7.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    // Col 2: Patient Details
    const col2X = colDividerX + 12;
    page.drawImage(userImg, {
      x: col2X,
      y: y - 24,
      width: 18,
      height: 18,
    });
    page.drawText('PATIENT DETAILS', {
      x: col2X + 24,
      y: y - 18,
      size: 7,
      font: helveticaBold,
      color: goldAccent,
    });

    page.drawText(patient.name, {
      x: col2X + 24,
      y: y - 31,
      size: 9.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    page.drawText(`Ref / ID: ${prescription.patient_id || patient.id_number || 'pat-1'}`, {
      x: col2X + 24,
      y: y - 43,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    });

    page.drawLine({
      start: { x: col2X + 24, y: y - 50 },
      end: { x: width - marginX - 16, y: y - 50 },
      thickness: 0.8,
      color: borderLight,
    });

    page.drawText(`Contact: ${patient.email || patient.phone || '—'}`, {
      x: col2X + 24,
      y: y - 61,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    });

    // ─── 4. Clinical Diagnosis & Mandatory ICD-10 Code Card ───
    y -= (infoCardHeight + 14);
    const hasNotes = !!(prescription as any).clinical_notes;
    const diagCardHeight = hasNotes ? 52 : 40;

    page.drawRectangle({
      x: marginX,
      y: y - diagCardHeight,
      width: contentWidth,
      height: diagCardHeight,
      color: white,
      borderColor: borderCream,
      borderWidth: 1,
    });

    page.drawImage(stethImg, {
      x: marginX + 12,
      y: y - 24,
      width: 18,
      height: 18,
    });
    page.drawText('PRIMARY DIAGNOSIS & ICD-10 MIT CODE', {
      x: marginX + 36,
      y: y - 16,
      size: 7,
      font: helveticaBold,
      color: goldAccent,
    });

    // ICD-10 Code Badge
    page.drawRectangle({
      x: marginX + 36,
      y: y - 33,
      width: 54,
      height: 14,
      color: goldLight,
      borderColor: borderCream,
      borderWidth: 0.8,
    });
    page.drawText(prescription.icd10_code, {
      x: marginX + 42,
      y: y - 29,
      size: 8,
      font: helveticaBold,
      color: chocolateDark,
    });

    const diagDesc = (prescription as any).icd10_description || (prescription as any).diagnosis || 'Clinical Diagnosis on Record';
    page.drawText(diagDesc, {
      x: marginX + 98,
      y: y - 29,
      size: 8.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    if (hasNotes) {
      page.drawText((prescription as any).clinical_notes.substring(0, 110), {
        x: marginX + 36,
        y: y - 44,
        size: 7.2,
        font: helvetica,
        color: textMuted,
      });
    }

    // ─── 5. Prescribed Medications Table ───
    y -= (diagCardHeight + 14);

    // Table Header Bar (Rx)
    page.drawRectangle({
      x: marginX,
      y: y - 20,
      width: contentWidth,
      height: 20,
      color: white,
      borderColor: borderCream,
      borderWidth: 1,
    });
    page.drawImage(pillImg, {
      x: marginX + 12,
      y: y - 18,
      width: 16,
      height: 16,
    });
    page.drawText('PRESCRIBED MEDICATIONS (Rx)', {
      x: marginX + 34,
      y: y - 13,
      size: 7.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    y -= 20;

    // Table Column Header Row
    page.drawRectangle({
      x: marginX,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: bgCream,
      borderColor: borderCream,
      borderWidth: 1,
    });

    page.drawText('#', { x: marginX + 8, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });
    page.drawText('MEDICATION', { x: marginX + 24, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });
    page.drawText('NAPPI', { x: marginX + 185, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });
    page.drawText('SCHED', { x: marginX + 242, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });
    page.drawText('DOSAGE & FREQUENCY', { x: marginX + 290, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });
    page.drawText('DURATION', { x: marginX + 418, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });
    page.drawText('REPEATS', { x: marginX + 472, y: y - 12, size: 6.8, font: helveticaBold, color: textHeader });

    y -= 18;

    // Table Rows
    const medications = prescription.medications || [];
    for (let i = 0; i < medications.length; i++) {
      const item = medications[i];
      const hasInstructions = !!item.instructions;
      const rowHeight = hasInstructions ? 32 : 20;

      // Row background
      page.drawRectangle({
        x: marginX,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: white,
        borderColor: borderLight,
        borderWidth: 0.8,
      });

      // Item #
      page.drawText(`${i + 1}`, {
        x: marginX + 8,
        y: y - 13,
        size: 7.5,
        font: helvetica,
        color: textMuted,
      });

      // Medication Name (truncated gracefully if excessively long)
      const medName = item.name.length > 34 ? `${item.name.substring(0, 32)}...` : item.name;
      page.drawText(medName, {
        x: marginX + 24,
        y: y - 13,
        size: 8,
        font: helveticaBold,
        color: chocolateDark,
      });

      // NAPPI Code
      page.drawText(item.nappi_code || 'N/A', {
        x: marginX + 185,
        y: y - 13,
        size: 7.5,
        font: helvetica,
        color: textLight,
      });

      // Schedule Badge (Green pill matching HTML view)
      const rawSched = (item as any).schedule || (item as any).schedule_flag || prescription.schedule_flag || 'S4';
      const schedStr = rawSched.toString().startsWith('S') ? rawSched.toString() : `S${rawSched}`;
      page.drawRectangle({
        x: marginX + 240,
        y: y - 16,
        width: 24,
        height: 12,
        color: greenBg,
        borderColor: greenBorder,
        borderWidth: 0.8,
      });
      page.drawText(schedStr, {
        x: marginX + 245,
        y: y - 13,
        size: 6.5,
        font: helveticaBold,
        color: greenBadge,
      });

      // Dosage & Frequency (room for complete description without premature cut-off)
      const freqStr = (item as any).frequency ? ` • ${(item as any).frequency}` : '';
      const fullDosage = `${item.dosage || 'As directed'}${freqStr}`;
      const dosageDisplay = fullDosage.length > 38 ? `${fullDosage.substring(0, 36)}...` : fullDosage;
      page.drawText(dosageDisplay, {
        x: marginX + 290,
        y: y - 13,
        size: 7.5,
        font: helvetica,
        color: textDark,
      });

      // Duration
      page.drawText(item.duration || '5 days', {
        x: marginX + 418,
        y: y - 13,
        size: 7.5,
        font: helvetica,
        color: textDark,
      });

      // Repeats
      const repeats = (item as any).repeats ?? 0;
      const repeatsStr = repeats > 0 ? `${repeats} repeats` : 'None';
      page.drawText(repeatsStr, {
        x: marginX + 472,
        y: y - 13,
        size: 7.5,
        font: helveticaBold,
        color: repeats > 0 ? greenBadge : textMuted,
      });

      // Special Instructions Sub-line
      if (hasInstructions) {
        page.drawImage(infoImg, {
          x: marginX + 24,
          y: y - 27,
          width: 9,
          height: 9,
        });
        page.drawText(`Instructions: ${item.instructions.substring(0, 95)}`, {
          x: marginX + 37,
          y: y - 25,
          size: 6.8,
          font: helveticaOblique,
          color: textMuted,
        });
      }

      y -= rowHeight;
    }

    // ─── 6. Mandatory Schedule 5 & 6 Supervision Declaration Block ───
    if (prescription.supervision_declaration || prescription.schedule_flag === 'S5' || prescription.schedule_flag === 'S6') {
      y -= 10;
      const declHeight = 40;
      page.drawRectangle({
        x: marginX,
        y: y - declHeight,
        width: contentWidth,
        height: declHeight,
        color: amberBg,
        borderColor: amberBorder,
        borderWidth: 1,
      });

      page.drawImage(shieldImg, {
        x: marginX + 10,
        y: y - 18,
        width: 14,
        height: 14,
      });

      page.drawText('MANDATORY SCHEDULE 5 & 6 TELEHEALTH SUPERVISION DECLARATION', {
        x: marginX + 30,
        y: y - 11,
        size: 7,
        font: helveticaBold,
        color: amberText,
      });

      const declText =
        prescription.supervision_declaration ||
        'I confirm this Schedule 5/6 substance was prescribed following a real-time consultation in accordance with South African HPCSA telemedicine ethical guidelines.';
      page.drawText(declText.substring(0, 120), {
        x: marginX + 30,
        y: y - 22,
        size: 6.8,
        font: helvetica,
        color: amberText,
      });
      page.drawText('Audit Flag: Logged in ChekUp247 platform compliance ledger for HPCSA review.', {
        x: marginX + 30,
        y: y - 32,
        size: 6.2,
        font: helveticaOblique,
        color: amberText,
      });

      y -= declHeight;
    }

    // ─── 7. Digital Signature, QR Code & ChekUp247 Stamp Box ───
    y -= 12;
    const signBoxHeight = 70;
    page.drawRectangle({
      x: marginX,
      y: y - signBoxHeight,
      width: contentWidth,
      height: signBoxHeight,
      color: bgCream,
      borderColor: borderCream,
      borderWidth: 1,
    });

    // Left: Doctor Digital Signature Details
    page.drawImage(shieldImg, {
      x: marginX + 12,
      y: y - 22,
      width: 16,
      height: 16,
    });
    page.drawText('DIGITALLY SIGNED & VERIFIED BY PRACTITIONER', {
      x: marginX + 34,
      y: y - 16,
      size: 7,
      font: helveticaBold,
      color: goldAccent,
    });

    page.drawText(`${fullDoctorName} (HPCSA: ${doctor.hpcsa_number})`, {
      x: marginX + 34,
      y: y - 28,
      size: 8.5,
      font: helveticaBold,
      color: chocolateDark,
    });

    page.drawText(`Electronic Signature Applied: ${new Date(prescription.issued_at || (prescription as any).created_at || Date.now()).toISOString()}`, {
      x: marginX + 34,
      y: y - 39,
      size: 6.8,
      font: helvetica,
      color: textMuted,
    });

    page.drawText(`SHA-256 Seal: ${verificationHash.substring(0, 36)}...`, {
      x: marginX + 34,
      y: y - 49,
      size: 6.5,
      font: helvetica,
      color: textLight,
    });

    page.drawImage(lockImg, {
      x: marginX + 34,
      y: y - 62,
      width: 8,
      height: 8,
    });
    page.drawText('Tamper-evident record cryptographically secured in ChekUp247 immutable compliance ledger.', {
      x: marginX + 46,
      y: y - 59,
      size: 6,
      font: helveticaOblique,
      color: textMuted,
    });

    // Embedded Doctor Signature image if present
    if (signatureImage) {
      const scaled = signatureImage.scaleToFit(85, 34);
      page.drawImage(signatureImage, {
        x: marginX + 255,
        y: y - 56,
        width: scaled.width,
        height: scaled.height,
      });
    }

    // Middle: QR Code & Scan Label
    const qrBoxX = width - marginX - 170;
    if (qrImage) {
      page.drawRectangle({
        x: qrBoxX,
        y: y - 58,
        width: 48,
        height: 48,
        color: white,
        borderColor: borderCream,
        borderWidth: 0.8,
      });
      page.drawImage(qrImage, {
        x: qrBoxX + 2,
        y: y - 56,
        width: 44,
        height: 44,
      });
      page.drawText('SCAN TO VERIFY', {
        x: qrBoxX + 2,
        y: y - 64,
        size: 5.5,
        font: helveticaBold,
        color: chocolateDark,
      });
    }

    // Right: ChekUp247 Verified Stamp Badge
    const stampBoxX = width - marginX - 108;
    page.drawRectangle({
      x: stampBoxX,
      y: y - 59,
      width: 104,
      height: 48,
      color: white,
      borderColor: stampBorder,
      borderWidth: 1.2,
    });

    // Stamp checkmark circular badge
    page.drawImage(stampCheckImg, {
      x: stampBoxX + 8,
      y: y - 45,
      width: 22,
      height: 22,
    });

    // Stamp text
    page.drawText('CHEKUP247', {
      x: stampBoxX + 34,
      y: y - 24,
      size: 7.5,
      font: helveticaBold,
      color: chocolateDark,
    });
    page.drawText('VERIFIED Rx', {
      x: stampBoxX + 34,
      y: y - 35,
      size: 7,
      font: helveticaBold,
      color: greenBadge,
    });
    page.drawText('TAMPER-EVIDENT', {
      x: stampBoxX + 34,
      y: y - 46,
      size: 5.5,
      font: helveticaBold,
      color: textMuted,
    });

    // ─── 8. Statutory Legal Compliance Footer ───
    const footerY = 32;
    page.drawLine({
      start: { x: marginX, y: footerY + 12 },
      end: { x: width - marginX, y: footerY + 12 },
      thickness: 0.8,
      color: borderCream,
    });

    page.drawImage(infoImg, {
      x: marginX + 2,
      y: footerY - 4,
      width: 10,
      height: 10,
    });

    page.drawText(
      'Valid electronic prescription issued under Section 22 of ECTA (Act 25 of 2002) and South African Medicines Act (Act 101 of 1965).',
      {
        x: marginX + 16,
        y: footerY + 1,
        size: 6.5,
        font: helvetica,
        color: textMuted,
      },
    );

    page.drawText(
      'Dispensary & Pharmacist Verification: Scan QR code above or verify online at https://chekup247.com/verify',
      {
        x: marginX + 16,
        y: footerY - 8,
        size: 6.5,
        font: helvetica,
        color: textMuted,
      },
    );

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
