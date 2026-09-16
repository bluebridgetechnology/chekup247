import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { envConfig } from '../../config/env.config';

@Injectable()
export class AdminIpAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(AdminIpAllowlistGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const rawAllowlist = envConfig.ADMIN_IP_ALLOWLIST?.trim();

    // If allowlist is empty or '*' or not in production, allow
    if (!rawAllowlist || rawAllowlist === '*' || envConfig.NODE_ENV !== 'production') {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '';

    const allowedIps = rawAllowlist.split(',').map((ip) => ip.trim()).filter(Boolean);

    const isAllowed = allowedIps.some((allowed) => {
      if (allowed === clientIp) return true;
      // Simple CIDR / prefix match (e.g. 192.168.1. or 10.0.)
      if (allowed.endsWith('*') && clientIp.startsWith(allowed.slice(0, -1))) return true;
      return false;
    });

    if (!isAllowed) {
      this.logger.warn(
        `[SECURITY AUDIT] Unauthorized Admin Access Attempt from IP: ${clientIp} on route: ${req.originalUrl || req.url}`,
      );
      throw new ForbiddenException(
        'Access Denied: Admin portal access is restricted to authorized corporate networks.',
      );
    }

    return true;
  }
}
