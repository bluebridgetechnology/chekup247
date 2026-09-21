import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ADMIN_SUB_ROLES_KEY } from '../decorators/auth.decorators';
import { User, AdminSubRole } from '../../database/operational/entities';

/**
 * Narrows an admin-only endpoint to specific admin sub-roles (RBAC,
 * Sprint D). Runs AFTER JwtAuthGuard + RolesGuard(UserRole.ADMIN) — those
 * already confirmed the caller is an authenticated admin, so this guard
 * only decides WHICH admin actions they may take.
 *
 * Looks up admin_sub_role from the database rather than the JWT payload:
 * the payload format is shared with patient/doctor tokens and already
 * has several issuance call sites (login, register, OTP verify, Google
 * auth, LocumStaff SSO) — adding a field there would mean touching all of
 * them and could invalidate outstanding tokens. A single indexed lookup
 * by primary key on the admin's own request is a small, safe cost here.
 *
 * A null admin_sub_role (accounts created before this column existed,
 * including a bootstrap admin migrated in place) is treated as
 * super_admin so no existing admin silently loses access.
 */
@Injectable()
export class AdminSubRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredSubRoles = this.reflector.getAllAndOverride<string[]>(ADMIN_SUB_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredSubRoles || requiredSubRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    const admin = await this.userRepository.findOne({ where: { id: userId } });
    const effectiveSubRole = admin?.admin_sub_role || AdminSubRole.SUPER_ADMIN;

    if (!requiredSubRoles.includes(effectiveSubRole)) {
      throw new ForbiddenException(
        `Access denied: this action requires one of [${requiredSubRoles.join(', ')}], your admin sub-role is ${effectiveSubRole}`,
      );
    }

    return true;
  }
}
