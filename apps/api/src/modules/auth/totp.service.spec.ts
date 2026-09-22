import { TotpService } from './totp.service';
import * as crypto from 'crypto';

describe('TotpService', () => {
  let service: TotpService;

  beforeEach(() => {
    service = new TotpService();
  });

  it('generateSecret should produce a base32 string with no ambiguous characters', () => {
    const secret = service.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThan(0);
  });

  it('buildOtpAuthUrl should embed the issuer, account, and secret', () => {
    const secret = service.generateSecret();
    const url = service.buildOtpAuthUrl(secret, 'admin@chekup247.com');

    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain(encodeURIComponent('ChekUp247 Admin:admin@chekup247.com'));
    expect(url).toContain(`secret=${secret}`);
  });

  it('verify should accept the code currently valid for the secret (round-trip)', () => {
    const secret = service.generateSecret();
    // Reimplement the generation independently (not via the service) to
    // prove verify() is checking real RFC 6238 math, not just echoing
    // back whatever the service itself would produce.
    const step = 30;
    const counter = Math.floor(Date.now() / 1000 / step);
    const code = generateReferenceCode(secret, counter);

    expect(service.verify(secret, code)).toBe(true);
  });

  it('verify should reject a code that does not match the secret', () => {
    const secret = service.generateSecret();
    expect(service.verify(secret, '000000')).toBe(false);
  });

  it('verify should reject a non-6-digit input outright', () => {
    const secret = service.generateSecret();
    expect(service.verify(secret, '12345')).toBe(false);
    expect(service.verify(secret, 'abcdef')).toBe(false);
    expect(service.verify(secret, '')).toBe(false);
  });

  it('verify should reject a code generated from a different secret', () => {
    const secretA = service.generateSecret();
    const secretB = service.generateSecret();
    const step = 30;
    const counter = Math.floor(Date.now() / 1000 / step);
    const codeForB = generateReferenceCode(secretB, counter);

    expect(service.verify(secretA, codeForB)).toBe(false);
  });
});

/**
 * Independent RFC 6238 reference implementation used only to generate a
 * known-correct code for round-trip assertions, so the test isn't just
 * checking the service against itself.
 */
function generateReferenceCode(secret: string, counter: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const key = Buffer.from(bytes);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binCode % 10 ** 6).padStart(6, '0');
}
