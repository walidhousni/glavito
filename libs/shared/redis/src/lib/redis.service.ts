import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private config: RedisConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      keyPrefix: this.configService.get<string>('REDIS_KEY_PREFIX', 'glavito:'),
    };
  }

  onModuleInit() {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async incr(key: string, ttl?: number): Promise<number> {
    const result = await this.client.incr(key);
    if (ttl && result === 1) {
      await this.client.expire(key, ttl);
    }
    return result;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // Rate limiting methods
  async checkRateLimit(key: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const count = await this.incr(key, window);
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;
    const resetTime = Date.now() + (window * 1000);

    return {
      allowed,
      remaining,
      resetTime,
    };
  }

  // Session management
  async createSession(sessionId: string, data: any, ttl: number): Promise<void> {
    await this.set(`session:${sessionId}`, JSON.stringify(data), ttl);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Cache management
  async cacheSet(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(value), ttl);
  }

  async cacheGet(key: string): Promise<any | null> {
    const data = await this.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async cacheDel(key: string): Promise<void> {
    await this.del(`cache:${key}`);
  }

  // Token blacklist for logout
  async blacklistToken(token: string, ttl: number): Promise<void> {
    await this.set(`blacklist:${token}`, '1', ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.exists(`blacklist:${token}`);
  }

  // Email verification tokens
  async storeEmailVerificationToken(email: string, token: string, ttl: number): Promise<void> {
    await this.set(`email-verify:${email}`, token, ttl);
  }

  async getEmailVerificationToken(email: string): Promise<string | null> {
    return this.get(`email-verify:${email}`);
  }

  async removeEmailVerificationToken(email: string): Promise<void> {
    await this.del(`email-verify:${email}`);
  }

  // Password reset tokens
  async storePasswordResetToken(email: string, token: string, ttl: number): Promise<void> {
    await this.set(`password-reset:${email}`, token, ttl);
  }

  async getPasswordResetToken(email: string): Promise<string | null> {
    return this.get(`password-reset:${email}`);
  }

  async removePasswordResetToken(email: string): Promise<void> {
    await this.del(`password-reset:${email}`);
  }

  // Failed login attempts
  async recordFailedLogin(email: string): Promise<number> {
    const key = `failed-login:${email}`;
    const attempts = await this.incr(key, 15 * 60); // 15 minute window
    return attempts;
  }

  async getFailedLoginAttempts(email: string): Promise<number> {
    const attempts = await this.get(`failed-login:${email}`);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  async clearFailedLoginAttempts(email: string): Promise<void> {
    await this.del(`failed-login:${email}`);
  }

  // 2FA temporary storage
  async store2FASecret(userId: string, secret: string, ttl: number): Promise<void> {
    await this.set(`2fa-secret:${userId}`, secret, ttl);
  }

  async get2FASecret(userId: string): Promise<string | null> {
    return this.get(`2fa-secret:${userId}`);
  }

  async remove2FASecret(userId: string): Promise<void> {
    await this.del(`2fa-secret:${userId}`);
  }

  // Webhook delivery tracking
  async trackWebhookDelivery(webhookId: string, deliveryId: string, data: any): Promise<void> {
    await this.cacheSet(`webhook:${webhookId}:${deliveryId}`, data, 24 * 3600); // 24 hours
  }

  async getWebhookDelivery(webhookId: string, deliveryId: string): Promise<any | null> {
    return this.cacheGet(`webhook:${webhookId}:${deliveryId}`);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Metrics
  async getStats(): Promise<{
    connectedClients: number;
    usedMemory: string;
    uptime: number;
  }> {
    const info = await this.client.info();
    const lines = info.split('\r\n');
    
    const connectedClients = parseInt(
      lines.find(line => line.startsWith('connected_clients:'))?.split(':')[1] || '0',
      10,
    );
    
    const usedMemory = lines.find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || '0B';
    
    const uptime = parseInt(
      lines.find(line => line.startsWith('uptime_in_seconds:'))?.split(':')[1] || '0',
      10,
    );

    return {
      connectedClients,
      usedMemory,
      uptime,
    };
  }
}