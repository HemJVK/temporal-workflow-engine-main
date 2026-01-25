import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsActivity {
  private readonly client: Twilio;
  private readonly fromNumber: string | undefined;
  private readonly mockTwilio: boolean | undefined;

  constructor(private readonly configService: ConfigService) {
    const sid = this.configService.get<string>('twilio.accountSid');
    const token = this.configService.get<string>('twilio.authToken');
    this.mockTwilio = this.configService.get<boolean>('twilio.mock') || false;
    this.fromNumber = this.configService.get<string>('twilio.fromNumber');

    // Initialize Twilio Client
    if (sid && token && this.fromNumber) {
      this.client = new Twilio(sid, token);
    }
  }

  async sendSmsActivity(args: { to: string; body: string }) {
    console.log(`[SMS] Sending to ${args.to}: ${args.body}`);

    if (!this.client) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    if (this.mockTwilio) {
      console.log('[SMS] Mock mode enabled - not sending SMS');
      return { success: true, sid: 'MOCK_SID', status: 'mocked' };
    }

    try {
      const message = await this.client.messages.create({
        body: args.body,
        from: this.fromNumber,
        to: args.to,
      });

      return {
        success: true,
        sid: message.sid,
        status: message.status,
      };
    } catch (error) {
      console.error('[SMS] Failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}
