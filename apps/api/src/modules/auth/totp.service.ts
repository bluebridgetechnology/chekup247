import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * RFC 6238 TOTP, implemented on Node's built-in `crypto` rather than a new
 * npm dependency (otplib/speakeasy) — deliberate given this session's
 * sustained tight-memory constraint, where `npm install` itself is a
 * heavier operation than writing ~80 lines of HMAC-SHA1 math. Compatible
 * with Google Authenticator, Authy, and any standard TOTP app: 30s step,
 * 6 digits, SHA1, base32 secret.
 */
@Injectable()
export class TotpService {
  private readonly step = 30;
  private readonly digits = 6;
  private readonly window = 1; // accept ±1 step (±30s) for clock drift

  generateSecret(): string {
    // 20 random bytes -> base32, the conventional TOTP secret length
    const bytes = crypto.randomBytes(20);
    return this.base32Encode(bytes);
  }

  buildOtpAuthUrl(secret: string, accountEmail: string, issuer = 'ChekUp247 Admin'): string {
    const label = encodeURIComponent(`${issuer}:${accountEmail}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: String(this.digits),
      period: String(this.step),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  verify(secret: string, token: string): boolean {
    if (!/^\d{6}$/.test(token)) return false;
    const counter = Math.floor(Date.now() / 1000 / this.step);
    for (let errorWindow = -this.window; errorWindow <= this.window; errorWindow++) {
      if (this.generateCode(secret, counter + errorWindow) === token) {
        return true;
      }
    }
    return false;
  }

  private generateCode(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binCode =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return String(binCode % 10 ** this.digits).padStart(this.digits, '0');
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
  }

  private base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
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
    return Buffer.from(bytes);
  }
}
