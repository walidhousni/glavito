'use client';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateTicketCreate(config: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!config.subject || String(config.subject).trim() === '') {
    errors.push({ field: 'subject', message: 'Subject is required' });
  }
  
  if (!config.channelId || String(config.channelId).trim() === '') {
    errors.push({ field: 'channelId', message: 'Channel is required' });
  }
  
  return errors;
}

export function validateTicketAssign(config: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!config.assignToUserId && !config.teamId) {
    errors.push({ field: 'assignToUserId', message: 'Either agent or team must be selected' });
  }
  
  return errors;
}

export function validateTemplateMessage(config: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!config.templateId || String(config.templateId).trim() === '') {
    errors.push({ field: 'templateId', message: 'Template ID is required' });
  }
  
  return errors;
}

export function validateCondition(config: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const conditions = Array.isArray(config.conditions) ? config.conditions : [];
  if (conditions.length === 0) {
    errors.push({ field: 'conditions', message: 'At least one condition is required' });
  }
  
  conditions.forEach((condition: any, index: number) => {
    if (!condition.field || String(condition.field).trim() === '') {
      errors.push({ field: `conditions[${index}].field`, message: 'Field is required' });
    }
    if (!condition.operator) {
      errors.push({ field: `conditions[${index}].operator`, message: 'Operator is required' });
    }
    if (condition.operator !== 'exists' && condition.operator !== 'not_exists' && (!condition.value || String(condition.value).trim() === '')) {
      errors.push({ field: `conditions[${index}].value`, message: 'Value is required' });
    }
  });
  
  return errors;
}

export function validateVariableSyntax(value: string): boolean {
  // Check if variable syntax is valid: {{variable}} or plain text
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = value.match(variableRegex);
  if (!matches) return true; // No variables, plain text is fine
  
  // Check each variable
  for (const match of matches) {
    const varName = match.slice(2, -2).trim();
    if (!varName) return false; // Empty variable name
  }
  
  return true;
}

