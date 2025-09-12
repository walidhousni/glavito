/**
 * Connection Testing Service
 * Handles testing of various integrations and connections during onboarding
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ConnectionTestResult {
  channel: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
  responseTime?: number;
}

export interface TestConfiguration {
  channel: string;
  config: any;
  timeout?: number;
}

@Injectable()
export class ConnectionTestingService {
  private readonly logger = new Logger(ConnectionTestingService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Test multiple connections simultaneously
   */
  async testConnections(
    sessionId: string,
    configurations: TestConfiguration[]
  ): Promise<ConnectionTestResult[]> {
    try {
      this.logger.log(`Testing ${configurations.length} connections for session: ${sessionId}`);

      const testPromises = configurations.map(config => 
        this.testSingleConnection(sessionId, config)
      );

      const results = await Promise.allSettled(testPromises);

      const connectionResults: ConnectionTestResult[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            channel: configurations[index].channel,
            status: 'error',
            message: `Test failed: ${result.reason?.message || 'Unknown error'}`,
            timestamp: new Date(),
          };
        }
      });

      // Emit results for real-time updates
      for (const result of connectionResults) {
        this.eventEmitter.emit('connection.test.completed', {
          sessionId,
          channel: result.channel,
          result,
        });
      }

      return connectionResults;
    } catch (error) {
      this.logger.error(`Failed to test connections: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test a single connection
   */
  async testSingleConnection(
    sessionId: string,
    configuration: TestConfiguration
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      let result: ConnectionTestResult;

      switch (configuration.channel) {
        case 'email':
          result = await this.testEmailConnection(configuration.config);
          break;
        case 'slack':
          result = await this.testSlackConnection(configuration.config);
          break;
        case 'teams':
          result = await this.testTeamsConnection(configuration.config);
          break;
        case 'whatsapp':
          result = await this.testWhatsAppConnection(configuration.config);
          break;
        case 'webhook':
          result = await this.testWebhookConnection(configuration.config);
          break;
        case 'stripe':
          result = await this.testStripeConnection(configuration.config);
          break;
        case 'database':
          result = await this.testDatabaseConnection(configuration.config);
          break;
        case 'ai_provider':
          result = await this.testAIProviderConnection(configuration.config);
          break;
        default:
          result = {
            channel: configuration.channel,
            status: 'error',
            message: `Unsupported channel type: ${configuration.channel}`,
            timestamp: new Date(),
          };
      }

      result.responseTime = Date.now() - startTime;
      result.timestamp = new Date();

      this.logger.log(`Connection test completed for ${configuration.channel}: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`Connection test failed for ${configuration.channel}: ${error.message}`);
      return {
        channel: configuration.channel,
        status: 'error',
        message: error.message,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test email connection (SMTP)
   */
  private async testEmailConnection(config: any): Promise<ConnectionTestResult> {
    try {
      // Validate required fields
      if (!config.host || !config.port || !config.username || !config.password) {
        return {
          channel: 'email',
          status: 'error',
          message: 'Missing required email configuration fields',
          timestamp: new Date(),
        };
      }

      // Test SMTP connection
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: config.host,
        port: config.port,
        secure: config.secure || false,
        auth: {
          user: config.username,
          pass: config.password,
        },
      });

      await transporter.verify();

      return {
        channel: 'email',
        status: 'success',
        message: 'Email connection successful',
        details: {
          host: config.host,
          port: config.port,
          secure: config.secure,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        channel: 'email',
        status: 'error',
        message: `Email connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test Slack connection
   */
  private async testSlackConnection(config: any): Promise<ConnectionTestResult> {
    try {
      if (!config.botToken) {
        return {
          channel: 'slack',
          status: 'error',
          message: 'Slack bot token is required',
          timestamp: new Date(),
        };
      }

      // Test Slack API connection
      const response = await firstValueFrom(
        this.httpService.get('https://slack.com/api/auth.test', {
          headers: {
            'Authorization': `Bearer ${config.botToken}`,
          },
          timeout: 10000,
        })
      );

      if (response.data.ok) {
        return {
          channel: 'slack',
          status: 'success',
          message: 'Slack connection successful',
          details: {
            team: response.data.team,
            user: response.data.user,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'slack',
          status: 'error',
          message: `Slack API error: ${response.data.error}`,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'slack',
        status: 'error',
        message: `Slack connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test Microsoft Teams connection
   */
  private async testTeamsConnection(config: any): Promise<ConnectionTestResult> {
    try {
      if (!config.tenantId || !config.clientId || !config.clientSecret) {
        return {
          channel: 'teams',
          status: 'error',
          message: 'Microsoft Teams configuration incomplete',
          timestamp: new Date(),
        };
      }

      // Test Microsoft Graph API connection
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
          new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          }
        )
      );

      if (tokenResponse.data.access_token) {
        return {
          channel: 'teams',
          status: 'success',
          message: 'Microsoft Teams connection successful',
          details: {
            tenantId: config.tenantId,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'teams',
          status: 'error',
          message: 'Failed to obtain access token',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'teams',
        status: 'error',
        message: `Teams connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test WhatsApp connection
   */
  private async testWhatsAppConnection(config: any): Promise<ConnectionTestResult> {
    try {
      if (!config.phoneNumberId || !config.accessToken) {
        return {
          channel: 'whatsapp',
          status: 'error',
          message: 'WhatsApp configuration incomplete',
          timestamp: new Date(),
        };
      }

      // Test WhatsApp Business API
      const response = await firstValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${config.accessToken}`,
            },
            timeout: 10000,
          }
        )
      );

      if (response.data.id) {
        return {
          channel: 'whatsapp',
          status: 'success',
          message: 'WhatsApp connection successful',
          details: {
            phoneNumberId: config.phoneNumberId,
            displayPhoneNumber: response.data.display_phone_number,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'whatsapp',
          status: 'error',
          message: 'Invalid WhatsApp configuration',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'whatsapp',
        status: 'error',
        message: `WhatsApp connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test webhook connection
   */
  private async testWebhookConnection(config: any): Promise<ConnectionTestResult> {
    try {
      if (!config.url) {
        return {
          channel: 'webhook',
          status: 'error',
          message: 'Webhook URL is required',
          timestamp: new Date(),
        };
      }

      // Send test webhook
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Connection test from Glavito',
      };

      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'Glavito-Webhook-Test/1.0',
      };

      if (config.secret) {
        // Add signature if secret is provided
        const crypto = require('crypto');
        const signature = crypto
          .createHmac('sha256', config.secret)
          .update(JSON.stringify(testPayload))
          .digest('hex');
        headers['X-Glavito-Signature'] = `sha256=${signature}`;
      }

      const response = await firstValueFrom(
        this.httpService.post(config.url, testPayload, {
          headers,
          timeout: 10000,
        })
      );

      if (response.status >= 200 && response.status < 300) {
        return {
          channel: 'webhook',
          status: 'success',
          message: 'Webhook connection successful',
          details: {
            url: config.url,
            statusCode: response.status,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'webhook',
          status: 'warning',
          message: `Webhook responded with status ${response.status}`,
          details: {
            statusCode: response.status,
          },
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'webhook',
        status: 'error',
        message: `Webhook connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test Stripe connection
   */
  private async testStripeConnection(config: any): Promise<ConnectionTestResult> {
    try {
      if (!config.accountId) {
        return {
          channel: 'stripe',
          status: 'error',
          message: 'Stripe account ID is required',
          timestamp: new Date(),
        };
      }

      const Stripe = require('stripe');
      const stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'));

      // Test by retrieving account information
      const account = await stripe.accounts.retrieve(config.accountId);

      if (account.id) {
        return {
          channel: 'stripe',
          status: 'success',
          message: 'Stripe connection successful',
          details: {
            accountId: account.id,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'stripe',
          status: 'error',
          message: 'Invalid Stripe account',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'stripe',
        status: 'error',
        message: `Stripe connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test database connection
   */
  private async testDatabaseConnection(config: any): Promise<ConnectionTestResult> {
    try {
      // Test database connection by performing a simple query
      const result = await this.databaseService.$queryRaw`SELECT 1 as test`;

      if (result) {
        return {
          channel: 'database',
          status: 'success',
          message: 'Database connection successful',
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'database',
          status: 'error',
          message: 'Database query failed',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'database',
        status: 'error',
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test AI provider connection
   */
  private async testAIProviderConnection(config: any): Promise<ConnectionTestResult> {
    try {
      if (!config.provider || !config.apiKey) {
        return {
          channel: 'ai_provider',
          status: 'error',
          message: 'AI provider and API key are required',
          timestamp: new Date(),
        };
      }

      let testResult: ConnectionTestResult;

      switch (config.provider) {
        case 'openai':
          testResult = await this.testOpenAIConnection(config);
          break;
        case 'anthropic':
          testResult = await this.testAnthropicConnection(config);
          break;
        case 'google':
          testResult = await this.testGoogleAIConnection(config);
          break;
        default:
          testResult = {
            channel: 'ai_provider',
            status: 'error',
            message: `Unsupported AI provider: ${config.provider}`,
            timestamp: new Date(),
          };
      }

      return testResult;
    } catch (error) {
      return {
        channel: 'ai_provider',
        status: 'error',
        message: `AI provider connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  private async testOpenAIConnection(config: any): Promise<ConnectionTestResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
          timeout: 10000,
        })
      );

      if (response.data.data && response.data.data.length > 0) {
        return {
          channel: 'ai_provider',
          status: 'success',
          message: 'OpenAI connection successful',
          details: {
            provider: 'openai',
            modelsAvailable: response.data.data.length,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'ai_provider',
          status: 'error',
          message: 'No OpenAI models available',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'ai_provider',
        status: 'error',
        message: `OpenAI connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  private async testAnthropicConnection(config: any): Promise<ConnectionTestResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Test' }],
          },
          {
            headers: {
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )
      );

      if (response.data.content) {
        return {
          channel: 'ai_provider',
          status: 'success',
          message: 'Anthropic connection successful',
          details: {
            provider: 'anthropic',
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'ai_provider',
          status: 'error',
          message: 'Invalid Anthropic response',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'ai_provider',
        status: 'error',
        message: `Anthropic connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  private async testGoogleAIConnection(config: any): Promise<ConnectionTestResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.apiKey}`,
          {
            contents: [{ parts: [{ text: 'Test' }] }],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )
      );

      if (response.data.candidates) {
        return {
          channel: 'ai_provider',
          status: 'success',
          message: 'Google AI connection successful',
          details: {
            provider: 'google',
          },
          timestamp: new Date(),
        };
      } else {
        return {
          channel: 'ai_provider',
          status: 'error',
          message: 'Invalid Google AI response',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        channel: 'ai_provider',
        status: 'error',
        message: `Google AI connection failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get connection test history for a session
   */
  async getConnectionTestHistory(sessionId: string) {
    try {
      // This would typically be stored in the database
      // For now, return empty array as we're not persisting test results
      return [];
    } catch (error) {
      this.logger.error(`Failed to get connection test history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate connection configuration before testing
   */
  validateConnectionConfig(channel: string, config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (channel) {
      case 'email':
        if (!config.host) errors.push('SMTP host is required');
        if (!config.port) errors.push('SMTP port is required');
        if (!config.username) errors.push('SMTP username is required');
        if (!config.password) errors.push('SMTP password is required');
        break;

      case 'slack':
        if (!config.botToken) errors.push('Slack bot token is required');
        break;

      case 'teams':
        if (!config.tenantId) errors.push('Microsoft tenant ID is required');
        if (!config.clientId) errors.push('Microsoft client ID is required');
        if (!config.clientSecret) errors.push('Microsoft client secret is required');
        break;

      case 'whatsapp':
        if (!config.phoneNumberId) errors.push('WhatsApp phone number ID is required');
        if (!config.accessToken) errors.push('WhatsApp access token is required');
        break;

      case 'webhook':
        if (!config.url) errors.push('Webhook URL is required');
        if (config.url && !config.url.startsWith('http')) {
          errors.push('Webhook URL must start with http:// or https://');
        }
        break;

      case 'stripe':
        if (!config.accountId) errors.push('Stripe account ID is required');
        break;

      case 'ai_provider':
        if (!config.provider) errors.push('AI provider is required');
        if (!config.apiKey) errors.push('AI provider API key is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}