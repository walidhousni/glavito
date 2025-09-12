import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelAdapter,
  ChannelMessage,
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload,
  MediaFile,
  ChannelCapabilities,
  ValidationResult,
  ChannelType
} from '@glavito/shared-types';

@Injectable()
export abstract class BaseChannelAdapter implements ChannelAdapter {
  protected readonly logger = new Logger(this.constructor.name);
  
  abstract readonly channelType: ChannelType;
  
  // Abstract methods that must be implemented by each channel
  abstract receiveMessage(webhook: WebhookPayload): Promise<ChannelMessage>;
  abstract sendMessage(conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult>;
  abstract getSupportedFeatures(): ChannelCapabilities;
  
  // Optional methods with default implementations
  async downloadMedia(mediaId: string): Promise<MediaFile> {
    throw new Error(`Media download not supported for ${this.channelType}`);
  }
  
  async uploadMedia(file: MediaFile): Promise<string> {
    throw new Error(`Media upload not supported for ${this.channelType}`);
  }
  
  validateMessage(message: OutgoingMessage): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Basic validation
    if (!message.content && !message.attachments?.length) {
      results.push({
          // field: 'content', // Removed as it doesn't exist in ValidationResult
          isValid: false,
          message: 'Message must have content or attachments'
        } as any);
    }
    
    if (!message.recipientId) {
      results.push({
          // field: 'recipientId', // Removed as it doesn't exist in ValidationResult
          isValid: false,
          message: 'Recipient ID is required'
        } as any);
    }
    
    // Channel-specific validation
    const channelValidation = this.validateChannelSpecific(message);
    results.push(...channelValidation);
    
    return results;
  }
  
  // Optional channel-specific methods
  async markAsRead?(conversationId: string, messageId: string): Promise<void> {
    this.logger.debug(`Mark as read not implemented for ${this.channelType}`);
  }
  
  async sendTypingIndicator?(conversationId: string): Promise<void> {
    this.logger.debug(`Typing indicator not implemented for ${this.channelType}`);
  }
  
  async sendPresenceUpdate?(status: 'online' | 'offline' | 'away'): Promise<void> {
    this.logger.debug(`Presence update not implemented for ${this.channelType}`);
  }
  
  // Protected helper methods
  protected validateChannelSpecific(message: OutgoingMessage): ValidationResult[] {
    // Override in child classes for channel-specific validation
    return [];
  }
  
  protected generateMessageId(): string {
    return `${this.channelType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  protected handleError(error: any, context: string): never {
    this.logger.error(`${context} failed for ${this.channelType}:`, error);
    throw error;
  }
  
  protected logSuccess(operation: string, details?: any): void {
    this.logger.debug(`${operation} successful for ${this.channelType}`, details);
  }
}