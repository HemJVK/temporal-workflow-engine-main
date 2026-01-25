// Update imports
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TwilioVoiceResponseModel } from 'src/models/twilio-voice-response.model';
import { getErrorMessage } from 'src/workflows/utils';
import { Twilio } from 'twilio';
import { CallInstance } from 'twilio/lib/rest/api/v2010/account/call';

@Injectable()
export class VoiceCallActivity {
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

  async makeNotificationCall(args: {
    to: string;
    message: string;
  }): Promise<TwilioVoiceResponseModel> {
    console.log(`[Notification Call] Calling ${args.to}`);

    if (!this.client || !this.fromNumber) {
      return {
        success: false,
        status: '400',
        callSid: '',
        message: 'Twilio config missing',
      };
    }

    let call: CallInstance | null = null;
    try {
      const twiml = `
        <Response>
          <Pause length="1"/>
          <Say voice="alice">${args.message}</Say>
          <Pause length="1"/>
          <Say>Please check your SMS for the booking link. Goodbye.</Say>
        </Response>
      `;

      if (this.mockTwilio) {
        console.log('[Notification Call] Mock mode enabled - not calling');
        return new TwilioVoiceResponseModel(
          true,
          'MOCK_SID',
          'mocked',
          'voice call mocked successfully',
        );
      }

      call = await this.client.calls.create({
        twiml: twiml,
        to: args.to,
        from: this.fromNumber,
      });

      const twilioVoiceResponse = new TwilioVoiceResponseModel(
        true,
        call.sid,
        call.status,
        'notification call completed successfully',
      );

      console.log(
        `[Notification Call] Success: ${JSON.stringify(twilioVoiceResponse)}`,
      );

      return twilioVoiceResponse;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('[Notification Call] Failed:', errorMessage);
      return new TwilioVoiceResponseModel(
        false,
        '',
        call ? call.status : '500',
        errorMessage,
      );
    }
  }

  async makeConversationalCall(args: {
    to: string;
    systemPrompt: string;
    callbackUrl: string; // Your NestJS URL
    metadata: { workflowId: string; runId: string; nodeId: string };
  }) {
    try {
      console.log(`[Conversation Call] Initiating call to ${args.to}`);

      // Example: Integration with Bland AI or Vapi
      const response = await axios.post(
        'https://app.apidog.com/link/project/1164435/apis/api-26077133/users',
        {
          phone_number: args.to,
          task: args.systemPrompt,
          webhook: args.callbackUrl,
          metadata: args.metadata,
        },
      );
      console.log(`response status: ${response.status}`);

      const twilioVoiceResponse = new TwilioVoiceResponseModel(
        true,
        'MockSID',
        'Mocked',
        'Conversation call completed successfully',
      );

      console.log(
        `[Conversation Call] Success: ${JSON.stringify(twilioVoiceResponse)}`,
      );

      return twilioVoiceResponse;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('[Conversation Call] Failed:', errorMessage);
      return new TwilioVoiceResponseModel(false, '', '500', errorMessage);
    }
  }
}
