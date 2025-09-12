import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userRole: string | string[] | undefined = user?.role;

    if (!userRole) {
      return false;
    }

    const hasRole = (neededRole: string): boolean => {
      // Support both string and array roles
      const roleMatches = Array.isArray(userRole)
        ? userRole.includes(neededRole)
        : userRole === neededRole;

      if (roleMatches) return true;

      // Treat super_admin as superset of admin and agent
      if (!Array.isArray(userRole) && userRole === 'super_admin') {
        return neededRole === 'admin' || neededRole === 'agent';
      }
      if (Array.isArray(userRole) && userRole.includes('super_admin')) {
        return neededRole === 'admin' || neededRole === 'agent';
      }

      return false;
    };

    return requiredRoles.some(hasRole);
  }
}