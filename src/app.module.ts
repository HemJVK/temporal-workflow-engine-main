import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { DatabaseActivity } from './activities/database.activity';
import { WorkerService } from './worker/worker.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { EmailActivity } from './activities/email.activity';
import { SmsActivity } from './activities/sms.activity';
import { HttpActivity } from './activities/http.activity';
import { SentimentActivity } from './activities/sentiment.analysis.activity';
import { ToolsModule } from './tools/tools.module';
import { ModelsModule } from './models/models.module';
import { LoggerModule } from './logger/logger.module';
import { AuditModule } from './audit/audit.module';
import { GenericLlmActivity } from './activities/ai/generic-llm.activity';
import { LangGraphResearchActivity } from './activities/ai/research-activity';
import { RunActivity } from './activities/run.activity';
import { EntityModule } from './entity/entity.module';
import { VoiceCallActivity } from './activities/voice-call.activity';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: validationSchema,
      envFilePath: '.env',
    }),
    ToolsModule,
    ModelsModule,
    LoggerModule,
    AuditModule,
    EntityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseActivity,
    EmailActivity,
    SmsActivity,
    HttpActivity,
    SentimentActivity,
    GenericLlmActivity,
    LangGraphResearchActivity,
    RunActivity,
    VoiceCallActivity,
    WorkerService,
  ],
})
export class AppModule {}
