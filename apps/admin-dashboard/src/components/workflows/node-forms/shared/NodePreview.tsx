'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ValidationError {
  field: string;
  message: string;
}

interface NodePreviewProps {
  nodeType: string;
  config: Record<string, any>;
  errors?: ValidationError[];
}

export function NodePreview({ nodeType, config, errors = [] }: NodePreviewProps) {
  const hasErrors = errors.length > 0;

  const getPreview = () => {
    switch (nodeType) {
      case 'ticket-create':
        return {
          title: 'Create Ticket',
          summary: [
            config.subject && `Subject: ${config.subject}`,
            config.priority && `Priority: ${config.priority}`,
            config.channelId && `Channel: ${config.channelId}`,
            Array.isArray(config.tags) && config.tags.length > 0 && `Tags: ${config.tags.join(', ')}`,
          ].filter(Boolean).join(' • ') || 'No configuration',
        };
      case 'ticket-update':
        return {
          title: 'Update Ticket',
          summary: [
            config.ticketId && `Ticket: ${config.ticketId}`,
            config.status && `Status: ${config.status}`,
            config.priority && `Priority: ${config.priority}`,
          ].filter(Boolean).join(' • ') || 'No changes specified',
        };
      case 'ticket-assign':
        return {
          title: 'Assign Ticket',
          summary: [
            config.ticketId && `Ticket: ${config.ticketId}`,
            config.assignToUserId && `Agent: ${config.assignToUserId}`,
            config.teamId && `Team: ${config.teamId}`,
          ].filter(Boolean).join(' • ') || 'No assignment specified',
        };
      case 'ticket-close':
        return {
          title: 'Close Ticket',
          summary: [
            config.ticketId && `Ticket: ${config.ticketId}`,
            config.status && `Status: ${config.status}`,
            config.reason && typeof config.reason === 'string' && `Reason: ${config.reason.substring(0, 50)}...`,
          ].filter(Boolean).join(' • ') || 'No configuration',
        };
      case 'template-message':
        return {
          title: 'Send Template Message',
          summary: [
            config.channel && `Channel: ${config.channel}`,
            config.templateId && `Template: ${config.templateId}`,
            config.conversationId && `Conversation: ${config.conversationId}`,
          ].filter(Boolean).join(' • ') || 'No configuration',
        };
      case 'send-notification':
      case 'send-whatsapp':
      case 'send-instagram':
        return {
          title: 'Send Message',
          summary: [
            config.channel && `Channel: ${config.channel}`,
            config.messageType && `Type: ${config.messageType}`,
            config.message && `Message: ${config.message.substring(0, 50)}...`,
          ].filter(Boolean).join(' • ') || 'No configuration',
        };
      case 'condition':
        return {
          title: 'Condition Check',
          summary: Array.isArray(config.conditions) && config.conditions.length > 0
            ? `${config.conditions.length} condition(s) configured`
            : 'No conditions',
        };
      case 'delay':
        return {
          title: 'Delay',
          summary: [
            config.delayType && `Type: ${config.delayType}`,
            config.delayType === 'fixed' && config.duration && `Duration: ${config.duration}ms`,
            config.delayType === 'cron' && config.cron && `Cron: ${config.cron}`,
            config.delayType === 'until' && config.resumeAt && `Until: ${new Date(config.resumeAt).toLocaleString()}`,
          ].filter(Boolean).join(' • ') || 'No delay configured',
        };
      default:
        return {
          title: nodeType,
          summary: 'Configuration available',
        };
    }
  };

  const preview = getPreview();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <span className="text-xs font-semibold">{preview.title}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{preview.summary}</p>
      {hasErrors && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">
            <div className="space-y-1">
              {errors.map((error, idx) => (
                <div key={idx}>
                  <strong>{error.field}:</strong> {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

