export type FeatureToggle = {
  featureKey: string;
  isEnabled: boolean;
  configuration?: Record<string, unknown> | null;
  restrictions?: Record<string, unknown> | Array<{ key: string; value: unknown }> | null;
};

export type FeatureContext = {
  role?: string;
  plan?: string;
  [k: string]: unknown;
};

export function isFeatureEnabled(
  toggles: FeatureToggle[] | Record<string, FeatureToggle | boolean> | undefined,
  featureKey: string,
  context?: FeatureContext
): boolean {
  if (!toggles) return false;
  let toggle: FeatureToggle | undefined;
  if (Array.isArray(toggles)) {
    toggle = toggles.find((t) => t.featureKey === featureKey);
  } else {
    const v = toggles[featureKey];
    if (typeof v === 'boolean') return v;
    toggle = v as FeatureToggle;
  }
  if (!toggle) return false;
  if (!toggle.isEnabled) return false;
  // Simple restrictions evaluation: role/plan match if provided
  const r = (toggle.restrictions || {}) as Record<string, unknown>;
  if (r['role'] && context?.role && r['role'] !== context.role) return false;
  if (r['plan'] && context?.plan && r['plan'] !== context.plan) return false;
  return true;
}


