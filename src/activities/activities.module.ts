import { Module } from '@nestjs/common';
import { DatabaseActivity } from './database.activity';
import { EmailActivity } from './email.activity';
import { SmsActivity } from './sms.activity';
import { HttpActivity } from './http.activity';
import { AuditActivity } from '../audit/audit.activity';
import { GenericLlmActivity } from './ai/generic-llm.activity';
import { RunActivity } from './run.activity';
import { EntityModule } from 'src/entity/entity.module';
import { VoiceCallActivity } from './voice-call.activity';

@Module({
  imports: [EntityModule],
  providers: [
    DatabaseActivity,
    EmailActivity,
    SmsActivity,
    HttpActivity,
    AuditActivity,
    GenericLlmActivity,
    RunActivity,
    VoiceCallActivity,
  ],
  exports: [
    DatabaseActivity,
    EmailActivity,
    SmsActivity,
    HttpActivity,
    AuditActivity,
    GenericLlmActivity,
    RunActivity,
    VoiceCallActivity,
  ],
})
export class ActivitiesModule {}
