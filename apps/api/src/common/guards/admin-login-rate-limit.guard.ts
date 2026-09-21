import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface Attempt {
  count: number;
  windowStart: number;
}

/**
 * In-memory sliding-window rate limiter, scoped to (IP + email) so one
 * abusive client can't lock out a legitimate admin sharing the same NAT
 * gateway. Deliberately not @nestjs/throttler or a Redis-backed limiter —
 * this is a single-instance NestJS deployment already (no mention of
 * horizontal scaling anywhere in this codebase), so an in-process Map is
 * proportionate; a Redis-backed limiter would be the right upgrade the
 * day this API runs as more than one process.
 *
 * Resets on process restart — acceptable for this threat model (credential
 * stuffing / brute force), not a security boundary that must survive a
 * deploy.
 */
@Injectable()
export class AdminLoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, Attempt>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const email = (request.body?.email || '').toLowerCase().trim();
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';
    const key = `${ip}:${email}`;

    const now = Date.now();
    this.pruneOccasionally(now);

    const existing = this.attempts.get(key);
    if (!existing || now - existing.windowStart > this.windowMs) {
      this.attempts.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (existing.count >= this.maxAttempts) {
      const retryAfterSeconds = Math.ceil((existing.windowStart + this.windowMs - now) / 1000);
      throw new HttpException(
        {
          message: `Too many login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    return true;
  }

  /** Records a successful login so a legitimate admin's own count resets. */
  recordSuccess(request: any): void {
    const email = (request.body?.email || '').toLowerCase().trim();
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';
    this.attempts.delete(`${ip}:${email}`);
  }

  private lastPrune = 0;
  private pruneOccasionally(now: number): void {
    // Cheap unbounded-growth guard: sweep expired entries at most once a
    // minute rather than on every request.
    if (now - this.lastPrune < 60_000) return;
    this.lastPrune = now;
    for (const [key, attempt] of this.attempts.entries()) {
      if (now - attempt.windowStart > this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }
}
