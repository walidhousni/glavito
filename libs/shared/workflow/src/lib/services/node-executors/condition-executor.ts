import { Injectable, Logger } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';

@Injectable()
export class ConditionNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(ConditionNodeExecutor.name);

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'condition' || nodeKind === 'switch';
  }

  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    const config = node.config || {};

    if (node.kind === 'condition') {
      return this.evaluateCondition(config, context);
    }

    if (node.kind === 'switch') {
      return this.evaluateSwitch(config, context);
    }

    return false;
  }

  private evaluateCondition(config: any, context: FlowExecutionContext): boolean {
    const { field, operator, value } = config;
    
    if (!field || !operator) {
      this.logger.warn('Condition missing field or operator');
      return false;
    }

    const fieldValue = this.getFieldValue(field, context);

    switch (operator) {
      case 'equals':
      case '==':
        return fieldValue == value;
      case 'not_equals':
      case '!=':
        return fieldValue != value;
      case 'greater_than':
      case '>':
        return Number(fieldValue) > Number(value);
      case 'greater_than_or_equal':
      case '>=':
        return Number(fieldValue) >= Number(value);
      case 'less_than':
      case '<':
        return Number(fieldValue) < Number(value);
      case 'less_than_or_equal':
      case '<=':
        return Number(fieldValue) <= Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'starts_with':
        return String(fieldValue).startsWith(String(value));
      case 'ends_with':
        return String(fieldValue).endsWith(String(value));
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      case 'not_exists':
        return fieldValue === null || fieldValue === undefined;
      case 'regex':
        try {
          const regex = new RegExp(value);
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  private evaluateSwitch(config: any, context: FlowExecutionContext): string {
    const { field, cases } = config;
    
    if (!field) {
      return 'default';
    }

    const fieldValue = this.getFieldValue(field, context);

    // Check each case
    if (Array.isArray(cases)) {
      for (const caseItem of cases) {
        if (caseItem.value === fieldValue) {
          return caseItem.output || 'default';
        }
      }
    }

    return 'default';
  }

  private getFieldValue(field: string, context: FlowExecutionContext): any {
    // Support nested field access: "variables.customerName" or "ticketId"
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

