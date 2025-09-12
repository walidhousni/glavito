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

  syncEntity(args: {
    tenantId: string;
    entity: string;
  }): Promise<{ exported?: number; imported?: number; updated?: number; skipped?: number }>;

  getDocs(): {
    name: string;
    description: string;
    setup: string[];
    env: string[];
    scopes?: string[];
  };
}


