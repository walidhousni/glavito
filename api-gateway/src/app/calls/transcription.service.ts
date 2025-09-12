import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DatabaseService } from '@glavito/shared-database';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly provider: string;
  private readonly apiUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService, private readonly http: HttpService, private readonly db: DatabaseService) {
    this.provider = this.config.get<string>('TRANSCRIBE_PROVIDER') || 'whisper';
    this.apiUrl = this.config.get<string>('TRANSCRIBE_API_URL');
    this.apiKey = this.config.get<string>('TRANSCRIBE_API_KEY');
  }

  async transcribeFromUrl(mediaUrl: string): Promise<{ text?: string; language?: string }> {
    try {
      const resp = await firstValueFrom(this.http.get(mediaUrl, { responseType: 'arraybuffer', timeout: 20000 }));
      const buffer = Buffer.from(resp.data);
      const mimeType = (resp as any)?.headers?.['content-type'] as string | undefined;
      return await this.transcribeBuffer(buffer, mimeType);
    } catch (e) {
      this.logger.error('transcribeFromUrl failed', e as any);
      return {};
    }
  }

  async transcribeBuffer(buffer: Buffer, mimeType?: string): Promise<{ text?: string; language?: string }> {
    try {
      if (!this.apiUrl || !this.apiKey) {
        this.logger.warn('Transcription API not configured');
        return {};
      }
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeType || 'audio/mpeg' }), 'audio');
      form.append('model', 'whisper-1');

      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form as unknown as BodyInit,
      });
      const data = await res.json();
      const text: string | undefined = data?.text || data?.segments?.map((s: any) => s?.text).join(' ');
      const language: string | undefined = data?.language;
      return { text, language };
    } catch (e) {
      this.logger.error('transcribeBuffer failed', e as any);
      return {};
    }
  }

  async transcribeRecording(callId: string, recordingUrl: string): Promise<void> {
    await this.db.call.update({ where: { id: callId }, data: { transcriptionStatus: 'processing', transcriptionProvider: this.provider } });

    try {
      const audioResponse = await firstValueFrom(this.http.get(recordingUrl, { responseType: 'arraybuffer', timeout: 20000 }));
      const audioBuffer = Buffer.from(audioResponse.data);

      const form = new FormData();
      form.append('file', new Blob([audioBuffer]), 'audio.mp3');
      form.append('model', 'whisper-1');

      const res = await fetch(this.apiUrl || '', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey || ''}`,
        },
        body: form as unknown as BodyInit,
      });
      const data = await res.json();
      const text: string | undefined = data?.text || data?.segments?.map((s: any) => s?.text).join(' ');
      const language: string | undefined = data?.language;

      await this.db.call.update({ where: { id: callId }, data: { transcriptionStatus: 'completed', transcription: text, transcriptionLanguage: language } });
    } catch (e) {
      this.logger.error('transcribeRecording failed', e as any);
      await this.db.call.update({ where: { id: callId }, data: { transcriptionStatus: 'failed' } });
    }
  }
}


