import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '@glavito/shared-database';
import { isFeatureEnabled } from '@glavito/shared-types';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const FeatureFlag = (flag: string) => (target: any, key?: any, descriptor?: any) => {
  if (descriptor) {
    Reflect.defineMetadata(FEATURE_FLAG_KEY, flag, descriptor.value);
  } else {
    Reflect.defineMetadata(FEATURE_FLAG_KEY, flag, target);
  }
};

@Injectable()
export class FeatureToggleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request?.user?.tenantId;
    const role: string | undefined = request?.user?.role;
    if (!tenantId) return true; // graceful in case of system routes

    const toggles = await this.db.featureToggle.findMany({ where: { tenantId } });
    const enabled = isFeatureEnabled(
      Array.isArray(toggles) ? toggles.map((t: any) => ({ featureKey: t.featureKey, isEnabled: t.isEnabled, configuration: t.configuration, restrictions: t.restrictions })) : [],
      featureKey,
      { role }
    );
    if (!enabled) throw new ForbiddenException(`Feature '${featureKey}' is disabled`);
    return true;
  }
}


