import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitRecord>();

  // Limits
  private readonly AUTH_LIMIT = 5; // 5 requests per 60 seconds on auth routes
  private readonly GENERAL_LIMIT = 100; // 100 requests per 60 seconds general
  private readonly WINDOW_MS = 60 * 1000; // 1 minute window

  constructor(private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Skip rate limiting if route has explicit metadata
    if (this.reflector) {
      const skip = this.reflector.getAllAndOverride<boolean>('skipRateLimit', [
        context.getHandler(),
        context.getClass(),
      ]);
      if (skip) return true;
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const path = req.originalUrl || req.url || '';
    const isAuthRoute = path.includes('/auth/') || path.includes('/login') || path.includes('/register');

    const limit = isAuthRoute ? this.AUTH_LIMIT : this.GENERAL_LIMIT;
    const bucketKey = `${clientIp}:${isAuthRoute ? 'auth' : 'general'}`;
    const now = Date.now();

    let record = this.store.get(bucketKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      };
      this.store.set(bucketKey, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, limit - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    // Set standard rate limit headers if res.setHeader is available
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetSeconds.toString());
    }

    if (record.count > limit) {
      this.logger.warn(
        `Rate limit exceeded for IP: ${clientIp} on path: ${path} (${record.count}/${limit})`,
      );

      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', resetSeconds.toString());
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: isAuthRoute
            ? 'Too many authentication attempts. Please try again in 1 minute.'
            : 'Rate limit exceeded. Please slow down your requests.',
          retryAfterSeconds: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Cleanup expired keys periodically
    if (this.store.size > 5000) {
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }

    return true;
  }
}
