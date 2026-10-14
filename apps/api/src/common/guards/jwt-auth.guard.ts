import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService, JwtPayload } from '../../modules/auth/token.service';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { GUEST_SCOPE, guestMayAccess } from './guest-scope';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication credentials not provided');
    }

    try {
      const payload: JwtPayload = this.tokenService.verifyAccessToken(token);
      if (payload.scope === GUEST_SCOPE && !guestMayAccess(request.method, request.originalUrl || request.url, payload.bid)) {
        throw new ForbiddenException(
          'This session only covers your booking and consultation. Please log in to access this.',
        );
      }
      request.user = { ...payload, id: (payload as any).id || payload.sub };
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException(
        err.message || 'Invalid or expired authentication credentials',
      );
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    // 1. Bearer token in Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      if (
        type?.toLowerCase() === 'bearer' &&
        token &&
        token !== 'null' &&
        token !== 'undefined'
      ) {
        return token;
      }
    }

    // 2. Cookie fallback
    if (request.cookies) {
      if (request.cookies.chekup_admin_session) {
        return request.cookies.chekup_admin_session;
      }
      if (request.cookies.chekup_doctor_session) {
        return request.cookies.chekup_doctor_session;
      }
      if (request.cookies.chekup_session) {
        return request.cookies.chekup_session;
      }
    }

    return null;
  }
}
