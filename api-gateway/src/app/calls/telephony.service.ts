import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly fromNumber: string | undefined;

  constructor(private readonly config: ConfigService, private readonly http: HttpService) {
    this.accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER');
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  async startOutboundCall(params: { to: string; from?: string; twimlUrl?: string }): Promise<{ sid?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn('Twilio not configured; skipping provider call');
      return {};
    }
    const from = params.from || this.fromNumber || '';
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;
    const body = new URLSearchParams({ To: params.to, From: from, Url: params.twimlUrl || 'https://handler.twilio.com/twiml/EHxxxx' });
    const authHeader = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;
    const res = await firstValueFrom(
      this.http.post(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authHeader },
        timeout: 10000,
      })
    );
    return { sid: res?.data?.sid };
  }
}


