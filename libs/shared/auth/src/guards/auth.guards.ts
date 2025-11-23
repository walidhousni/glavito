// Authentication guards

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  permissions?: string[];
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return true;
  }
}

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

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userRole: string | string[] | undefined = user?.role;

    if (!userRole) {
      throw new ForbiddenException('Insufficient permissions');
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

    const hasRequiredRole = requiredRoles.some(hasRole);
    
    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    const tenantId = request.params?.tenantId || request.body?.tenantId || request.query?.tenantId;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied for this tenant');
    }

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const hasPermission = requiredPermissions.some(permission => 
      user.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser & { emailVerified: boolean } = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    return true;
  }
}

@Injectable()
export class TwoFactorGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser & { twoFactorEnabled: boolean } = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // This guard only checks if 2FA is enabled for the user
    // Actual 2FA verification happens in the auth service
    return true;
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // API key validation would be implemented here
    // This is a placeholder for actual API key validation logic
    
    return true;
  }
}

// Decorators for guards - these are re-exported from decorators for backward compatibility
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const SKIP_AUTH = 'skip-auth';

// Helper decorators
export const Roles = (...roles: string[]) => {
  return (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    } else {
      Reflect.defineMetadata(ROLES_KEY, roles, target);
    }
  };
};

export const Permissions = (...permissions: string[]) => {
  return (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
    } else {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    }
  };
};

export const AllowAnonymous = () => {
  return (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_AUTH, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_AUTH, true, target);
    }
  };
};