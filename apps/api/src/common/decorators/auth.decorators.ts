import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from '../../database/operational/entities';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRole | string)[]) =>
  SetMetadata(ROLES_KEY, roles);

export const ADMIN_SUB_ROLES_KEY = 'adminSubRoles';
/**
 * Restrict an admin-only endpoint to specific admin sub-roles (e.g.
 * super_admin). Compose alongside @Roles(UserRole.ADMIN) — this decorator
 * only narrows WITHIN the admin role, it does not replace the role check.
 * An admin with a null admin_sub_role (pre-migration accounts) is treated
 * as super_admin by AdminSubRolesGuard.
 */
export const AdminSubRoles = (...subRoles: string[]) =>
  SetMetadata(ADMIN_SUB_ROLES_KEY, subRoles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return null;
    if (data === 'id') {
      return user.id || user.sub;
    }
    return data ? user[data] : user;
  },
);
