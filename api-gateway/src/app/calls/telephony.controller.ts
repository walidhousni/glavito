import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '@glavito/shared-database';
import { TranscriptionService } from './transcription.service';

@ApiTags('Telephony')
@Controller('calls/telephony/twilio')
export class TelephonyController {
  constructor(private readonly db: DatabaseService, private readonly transcription: TranscriptionService) {}

  // TwiML for outbound calls (basic placeholder with recording)
  @Post('voice')
  voice(@Body() body: any, @Res() res: Response) {
    const recordingCallback = '/api/calls/telephony/twilio/recording';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call. This call may be recorded.</Say>
  <Record transcribe="true" transcribeCallback="${recordingCallback}" maxLength="3600" playBeep="true" />
</Response>`;
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  }

  // Simple IVR gather example
  @Post('ivr')
  ivr(@Body() _body: any, @Res() res: Response) {
    const statusCallback = '/api/calls/telephony/twilio/status';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/calls/telephony/twilio/ivr/route" method="POST">
    <Say>Press 1 for support. Press 2 for sales.</Say>
  </Gather>
  <Say>We didn't receive any input. Goodbye!</Say>
  <Hangup />
</Response>`;
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  }

  @Post('ivr/route')
  ivrRoute(@Body() body: any, @Res() res: Response) {
    const digit = body?.Digits;
    // In real flow, route to queue/agent group based on digit
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Routing your call.</Say>
  <Dial>${digit === '2' ? '+10000000002' : '+10000000001'}</Dial>
</Response>`;
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  }

  // Call status updates
  @Post('status')
  async status(@Body() body: any, @Headers('x-twilio-signature') _sig: string | undefined) {
    const sid: string | undefined = body.CallSid;
    const status: string | undefined = body.CallStatus;
    if (!sid) return { ok: true };
    try {
      await this.db.call.updateMany({ where: { externalId: sid }, data: { status: status || undefined } });
    } catch {}
    return { ok: true };
  }

  // Recording + transcription callback
  @Post('recording')
  async recording(@Body() body: any, @Headers('x-twilio-signature') _sig: string | undefined) {
    const sid: string | undefined = body.CallSid || body.RecordingSid;
    const recordingUrl: string | undefined = body.RecordingUrl;
    const transcriptionText: string | undefined = body.TranscriptionText;
    if (!sid) return { ok: true };
    try {
      const updated = await this.db.call.updateMany({
        where: { externalId: sid },
        data: {
          recordingUrl: recordingUrl ? `${recordingUrl}.mp3` : undefined,
          transcription: transcriptionText || undefined,
        },
      });
      if (updated.count > 0 && recordingUrl && !transcriptionText) {
        const call = await this.db.call.findFirst({ where: { externalId: sid } });
        if (call?.id) await this.transcription.transcribeRecording(call.id, `${recordingUrl}.mp3`);
      }
    } catch {}
    return { ok: true };
  }
}


