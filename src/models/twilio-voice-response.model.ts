export class TwilioVoiceResponseModel {
  constructor(
    public success: boolean,
    public callSid: string,
    public status: string,
    public message: string,
  ) {}
}
