import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
}

@Injectable()
export class TwilioAdapter {
  private readonly logger = new Logger(TwilioAdapter.name);
  private client: twilio.Twilio;
  private phoneNumber?: string;

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.phoneNumber = config.phoneNumber;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.api.accounts(this.client.accountSid).fetch();
      return true;
    } catch (error) {
      this.logger.error('Twilio connection test failed', error);
      return false;
    }
  }

  // SMS
  async sendSMS(to: string, body: string, from?: string) {
    return this.client.messages.create({
      to,
      from: from || this.phoneNumber,
      body,
    });
  }

  async getMessages(params?: { to?: string; from?: string; limit?: number }) {
    return this.client.messages.list(params);
  }

  async getMessage(messageSid: string) {
    return this.client.messages(messageSid).fetch();
  }

  // Voice
  async makeCall(to: string, url: string, from?: string) {
    return this.client.calls.create({
      to,
      from: from || this.phoneNumber,
      url,
    });
  }

  async getCalls(params?: { to?: string; from?: string; status?: string; limit?: number }) {
    return this.client.calls.list(params);
  }

  async getCall(callSid: string) {
    return this.client.calls(callSid).fetch();
  }

  async updateCall(callSid: string, params: { status?: string; url?: string }) {
    return this.client.calls(callSid).update(params);
  }

  // Phone Numbers
  async getPhoneNumbers() {
    return this.client.incomingPhoneNumbers.list();
  }

  async getPhoneNumber(phoneSid: string) {
    return this.client.incomingPhoneNumbers(phoneSid).fetch();
  }

  async searchAvailableNumbers(params: {
    areaCode?: string;
    contains?: string;
    country?: string;
  }) {
    const country = params.country || 'US';
    return this.client.availablePhoneNumbers(country).local.list(params);
  }

  async purchasePhoneNumber(phoneNumber: string) {
    return this.client.incomingPhoneNumbers.create({ phoneNumber });
  }

  async releasePhoneNumber(phoneSid: string) {
    return this.client.incomingPhoneNumbers(phoneSid).remove();
  }

  // Verify webhook signature
  verifyWebhook(url: string, params: any, signature: string): boolean {
    return twilio.validateRequest(this.client.authToken!, url, params, signature);
  }

  // Recording
  async getRecordings(callSid?: string) {
    return this.client.recordings.list({ callSid });
  }

  async getRecording(recordingSid: string) {
    return this.client.recordings(recordingSid).fetch();
  }

  async deleteRecording(recordingSid: string) {
    return this.client.recordings(recordingSid).remove();
  }

  // TwiML Response helpers
  createTwiML(): twilio.twiml.VoiceResponse {
    return new twilio.twiml.VoiceResponse();
  }
}

