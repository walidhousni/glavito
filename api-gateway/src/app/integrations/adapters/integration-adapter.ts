export interface IntegrationAdapter {
  provider: string;

  buildAuthorizeUrl(args: {
    tenantId: string;
    redirectUri: string;
    state?: string;
  }): Promise<string>;

  handleCallback(args: {
    tenantId: string;
    code?: string;
    state?: string;
    redirectUri: string;
  }): Promise<{ connected: boolean; config: Record<string, unknown> }>;

  refreshToken(args: {
    tenantId: string;
    refreshToken: string;
    redirectUri?: string;
  }): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string }>;

  revokeToken?(args: {
    tenantId: string;
    token: string;
  }): Promise<boolean>;

  syncEntity(args: {
    tenantId: string;
    entity: string;
    lastSyncAt?: Date | null;
  }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number }>;

  getDocs(): {
    name: string;
    description: string;
    setup: string[];
    env: string[];
    scopes?: string[];
  };
}


