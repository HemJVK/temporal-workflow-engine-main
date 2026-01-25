import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SendGrid from '@sendgrid/mail';

@Injectable()
export class EmailActivity {
  private readonly fromEmail: string | undefined;
  private readonly mockTwilio: boolean | undefined;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');
    this.mockTwilio = this.configService.get<boolean>('twilio.mock') || false;

    if (apiKey) {
      SendGrid.setApiKey(apiKey);
    } else {
      console.error('❌ Missing SENDGRID_API_KEY');
    }
  }

  async sendEmail(args: { to: string; subject: string; body: string }) {
    if (!this.fromEmail) {
      throw new Error('Missing SENDGRID_FROM_EMAIL in environment variables');
    }

    console.log(`[Email] Sending to ${args.to}: ${args.subject}`);

    if (this.mockTwilio) {
      console.log('[Email] Mock mode enabled - not sending email');
      return {
        success: true,
        timestamp: new Date().toISOString(),
        status: 'mocked',
      };
    }

    try {
      const msg = {
        to: args.to,
        from: this.fromEmail,
        subject: args.subject,
        text: args.body,
        html: args.body.replaceAll(/\n/g, '<br>'),
      };

      await SendGrid.send(msg);
      return {
        success: true,
        timestamp: new Date().toISOString(),
        status: 'success',
      };
    } catch (error: any) {
      console.error('[Email] Failed:', error.response?.body || error.message);
      return { success: false, error: error.message };
    }
  }
}
