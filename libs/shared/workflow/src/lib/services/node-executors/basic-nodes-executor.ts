import { Injectable, Logger } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BasicNodesExecutor implements NodeExecutor {
  private readonly logger = new Logger(BasicNodesExecutor.name);

  constructor(private readonly httpService: HttpService) {}

  canHandle(nodeKind: string): boolean {
    return ['channel_in', 'start', 'end', 'wait', 'set_variable', 'http_request', 'notification'].includes(nodeKind);
  }

  async execute(node: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const config = (node['config'] || {}) as Record<string, unknown>;

    const nodeKind = node['kind'] as string;
    switch (nodeKind) {
      case 'channel_in':
      case 'start':
        return this.handleStart(config, context);
      
      case 'end':
        return this.handleEnd(config, context);
      
      case 'wait':
        return this.handleWait(config, context);
      
      case 'set_variable':
        return this.handleSetVariable(config, context);
      
      case 'http_request':
        return this.handleHttpRequest(config, context);
      
      case 'notification':
        return this.handleNotification(config, context);
      
      default:
        throw new Error(`Unknown node kind: ${nodeKind}`);
    }
  }

  private async handleStart(_config: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    this.logger.log('Flow started');
    return { started: true, context };
  }

  private async handleEnd(config: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    this.logger.log('Flow ended');
    return {
      ended: true,
      message: (config['message'] as string) || 'Flow completed',
      variables: context.variables,
    };
  }

  private async handleWait(config: Record<string, unknown>, _context: FlowExecutionContext): Promise<Record<string, unknown>> {
    // Wait is handled by FlowExecutionService
    // This just returns the wait configuration
    return {
      waited: true,
      delayMs: (config['delayMs'] as number) || 0,
      resumeAt: config['resumeAt'],
    };
  }

  private async handleSetVariable(config: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const variableName = config['variableName'] as string;
    const value = config['value'];
    const expression = config['expression'] as string | undefined;

    if (!variableName) {
      throw new Error('variableName required for set_variable node');
    }

    let newValue = value;

    // If expression is provided, evaluate it
    if (expression) {
      newValue = this.evaluateExpression(expression, context);
    }

    // Update context variables
    context.variables[variableName] = newValue;

    this.logger.log(`Variable set: ${variableName} = ${newValue}`);

    return {
      variableName,
      value: newValue,
    };
  }

  private async handleHttpRequest(config: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const { method, url, headers, body } = config;

    if (!url || typeof url !== 'string') {
      throw new Error('url required for http_request node');
    }

    // Replace variables in URL and body
    const finalUrl = this.replaceVariables(url, context.variables);
    const finalBody = body ? JSON.parse(this.replaceVariables(JSON.stringify(body), context.variables)) : undefined;

    this.logger.log(`HTTP ${method || 'GET'} request to: ${finalUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: (method as string) || 'GET',
          url: finalUrl,
          headers: {
            'Content-Type': 'application/json',
            ...(headers as Record<string, string> || {}),
          },
          data: finalBody,
        })
      );

      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`HTTP request failed: ${errorMessage}`);
      throw error;
    }
  }

  private async handleNotification(config: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const title = config['title'] as string | undefined;
    const message = config['message'] as string | undefined;
    const userId = config['userId'] as string | undefined;
    const type = config['type'] as string | undefined;

    if (!userId && !context.userId) {
      throw new Error('userId required for notification node');
    }

    this.logger.log(`Notification: ${title || ''} to user ${userId || context.userId}`);

    // This would integrate with your notification system
    return {
      notified: true,
      userId: userId || context.userId,
      title: this.replaceVariables(title || '', context.variables),
      message: this.replaceVariables(message || '', context.variables),
      type: type || 'info',
    };
  }

  private evaluateExpression(expression: string, context: FlowExecutionContext): unknown {
    // Simple expression evaluation
    // For now, just support variable references like "${variableName}"
    const match = expression.match(/^\$\{(.+)\}$/);
    if (match) {
      const varName = match[1];
      return context.variables[varName];
    }

    // Otherwise, return as-is
    return expression;
  }

  private replaceVariables(template: string, variables: Record<string, unknown>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }
}

