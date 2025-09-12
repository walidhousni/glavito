import { Injectable, NestMiddleware, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@glavito/shared-redis';

export interface SecurityConfig {
  rateLimit: {
    window: number;
    max: number;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
  };
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly securityConfig: SecurityConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const corsEnv = this.configService.get<string>('CORS_ALLOWED_ORIGINS', '');
    const parsedOrigins = corsEnv
      ? corsEnv.split(',').map((s) => s.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3004'];

    this.securityConfig = {
      rateLimit: {
        window: this.configService.get<number>('RATE_LIMIT_WINDOW', 15 * 60), // 15 minutes
        max: this.configService.get<number>('RATE_LIMIT_MAX', 100),
      },
      cors: {
        allowedOrigins: parsedOrigins,
        allowedMethods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-host', 'X-Tenant-Host', 'X-Correlation-Id', 'X-Tenant-ID', 'Accept-Language'],
      },
      helmet: {
        contentSecurityPolicy: true,
        crossOriginEmbedderPolicy: true,
      },
    };
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Allow ACME HTTP-01 challenges and health without strict checks
      if (req.path.startsWith('/.well-known/acme-challenge')) {
        return next();
      }

      // Derive tenant host if not provided and expose defaults for branding
      const host = (req.hostname || req.headers.host || '').toString();
      if (!req.headers['x-tenant-host'] && host) {
        (req.headers as any)['x-tenant-host'] = host;
      }
      const defaultBrand = this.configService.get<string>('DEFAULT_BRAND_NAME');
      if (defaultBrand && !req.headers['x-brand-name']) {
        (req.headers as any)['x-brand-name'] = defaultBrand;
      }

      // Locale negotiation
      const acceptLanguage = req.get('Accept-Language') || '';
      const preferred = (acceptLanguage || '').split(',')[0]?.split('-')[0]?.toLowerCase();
      const supported = ['en', 'fr', 'ar'];
      const locale = supported.includes(preferred) ? preferred : 'en';
      (req.headers as any)['x-locale'] = locale;
      res.setHeader('Content-Language', locale);

      // CORS Headers
      this.setCorsHeaders(req, res);

      // Security Headers
      this.setSecurityHeaders(res);

      // Rate Limiting: skip for safe methods and in non-production to avoid noisy dev UX
      const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
      const isProduction = (this.configService.get<string>('NODE_ENV') || '').toLowerCase() === 'production'
      if (!isSafeMethod && isProduction) {
        await this.checkRateLimit(req);
      }

      // Request Validation
      this.validateRequest(req);

      // IP Blacklist Check
      await this.checkIPBlacklist(req);

      // User-Agent Validation
      this.validateUserAgent(req);

      // Content-Type Validation
      this.validateContentType(req);

      next();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        res.status(error.getStatus()).json({
          error: error.message,
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }
    }
  }

  private setCorsHeaders(req: Request, res: Response) {
    const origin = req.get('Origin');
    if (origin && this.securityConfig.cors.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (this.securityConfig.cors.allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', this.securityConfig.cors.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', this.securityConfig.cors.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Quick preflight handling
    if (req.method === 'OPTIONS') {
      res.status(204).end();
    }
  }

  private setSecurityHeaders(res: Response) {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    if (this.securityConfig.helmet.contentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', this.getCSPPolicy());
    }

    // Cross Origin Embedder Policy
    if (this.securityConfig.helmet.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }

    // Cross Origin Opener Policy
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  private getCSPPolicy(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }

  private async checkRateLimit(req: Request) {
    const identifier = this.getRateLimitIdentifier(req);
    const key = `rate_limit:${identifier}`;
    
    const result = await this.redisService.checkRateLimit(
      key,
      this.securityConfig.rateLimit.max,
      this.securityConfig.rateLimit.window,
    );

    if (!result.allowed) {
      // Soften: return 429 with headers and short message to avoid crashing dashboards
      const retryAfterSec = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000))
      req.res?.setHeader('Retry-After', retryAfterSec)
      throw new BadRequestException('Rate limit exceeded')
    }

    // Add rate limit headers
    req.res?.setHeader('X-RateLimit-Limit', this.securityConfig.rateLimit.max);
    req.res?.setHeader('X-RateLimit-Remaining', result.remaining);
    req.res?.setHeader('X-RateLimit-Reset', result.resetTime);
  }

  private getRateLimitIdentifier(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
    // bucket analytics endpoints less aggressively to avoid fan-out throttling in UI
    const path = req.path.startsWith('/analytics') ? '/analytics' : req.path
    return `${ip}:${path}:${req.method}`;
  }

  private validateRequest(req: Request) {
    // Check for common attack patterns
    this.checkForSQLInjection(req);
    this.checkForXSS(req);
    this.checkForPathTraversal(req);
  }

  private checkForSQLInjection(req: Request) {
    const isProduction = (this.configService.get<string>('NODE_ENV') || '').toLowerCase() === 'production';

    // Use strong signatures only to avoid false positives on normal prose
    const strictPatterns = [
      /\bUNION\b\s+\bSELECT\b/i,
      /\bOR\b\s+\d+\s*=\s*\d+/i,
      /;--/,
      /--\s*$/m,
      /\/\*[\s\S]*?\*\//,
      /\bDROP\b\s+\bTABLE\b/i,
      /\bALTER\b\s+\bTABLE\b/i,
      /\bINSERT\b\s+\bINTO\b/i,
      /\bDELETE\b\s+\bFROM\b/i
    ];

    const safeTextKeys = new Set(['subject','content','message','normalizedContent','description','title','question','answer','snippet','notes']);

    const checkString = (str: string) => strictPatterns.some((p) => p.test(str));

    const checkObject = (obj: any, keyHint?: string) => {
      if (!isProduction) return; // do not block in non-production
      if (typeof obj === 'string') {
        if (keyHint && safeTextKeys.has(keyHint)) return; // allow typical human text fields
        if (checkString(obj)) {
          throw new BadRequestException('Potential SQL injection detected');
        }
        return;
      }
      if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj)) {
          checkObject(v as any, k);
        }
      }
    };

    checkObject(req.query);
    checkObject(req.body);
    checkObject(req.params);
  }

  private checkForXSS(req: Request) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ];

    const checkString = (str: string) => {
      return xssPatterns.some(pattern => pattern.test(str));
    };

    const checkObject = (obj: any) => {
      if (typeof obj === 'string' && checkString(obj)) {
        throw new BadRequestException('Potential XSS attack detected');
      }
      if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(checkObject);
      }
    };

    checkObject(req.query);
    checkObject(req.body);
    checkObject(req.params);
  }

  private checkForPathTraversal(req: Request) {
    const pathTraversalPattern = /\.\.(\\|\/)/;
    
    const checkString = (str: string) => {
      return pathTraversalPattern.test(str);
    };

    const checkObject = (obj: any) => {
      if (typeof obj === 'string' && checkString(obj)) {
        throw new BadRequestException('Potential path traversal attack detected');
      }
      if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(checkObject);
      }
    };

    checkObject(req.query);
    checkObject(req.body);
    checkObject(req.params);
  }

  private async checkIPBlacklist(req: Request) {
    const ip = this.getClientIP(req);
    const isBlacklisted = await this.redisService.exists(`blacklist:ip:${ip}`);
    
    if (isBlacklisted) {
      throw new UnauthorizedException('Access denied');
    }
  }

  private validateUserAgent(req: Request) {
    const userAgent = req.get('User-Agent') || '';

    // Be lenient for safe/idempotent methods and environments that strip UA (e.g., service workers, proxies)
    if (!userAgent || userAgent.length < 10) {
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return; // allow
      }
      // For state-changing methods, still allow but do basic pattern checks below
    }

    // Check for known bad user agents (best-effort; do not block legitimate browsers)
    const badUserAgents = [
      'sqlmap',
      'nikto',
      'w3af',
      'dirbuster',
      'gobuster',
      'hydra',
    ];

    if (userAgent && badUserAgents.some(bad => userAgent.toLowerCase().includes(bad))) {
      throw new BadRequestException('Suspicious User-Agent detected');
    }
  }

  private validateContentType(req: Request) {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType) {
        // Default missing Content-Type to application/json to be lenient with empty-body requests
        req.headers['content-type'] = 'application/json';
        return;
      }

      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain',
      ];

      const isAllowed = allowedContentTypes.some(type => 
        contentType.toLowerCase().includes(type)
      );

      if (!isAllowed) {
        throw new BadRequestException('Unsupported Content-Type');
      }
    }
  }

  private getClientIP(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const realIP = req.get('X-Real-IP');
    
    return forwarded ? forwarded.split(',')[0].trim() : 
           realIP || req.ip || 'unknown';
  }
}