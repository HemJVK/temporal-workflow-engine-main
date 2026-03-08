import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { DatabaseActivity } from './activities/database.activity';
import { WorkerService } from './worker/worker.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { HttpActivity } from './activities/http.activity';
import { SentimentActivity } from './activities/sentiment.analysis.activity';
import { ToolsModule } from './tools/tools.module';
import { ModelsModule } from './models/models.module';
import { LoggerModule } from './logger/logger.module';
import { AuditModule } from './audit/audit.module';
import { McpModule } from './mcp/mcp.module';
import { GenericLlmActivity } from './activities/ai/generic-llm.activity';
import { LangGraphActivity } from './activities/ai/langgraph.activity';
import { LangGraphResearchActivity } from './activities/ai/research-activity';
import { McpClientService } from './activities/ai/mcp-client.service';
import { RunActivity } from './activities/run.activity';
import { EntityModule } from './entity/entity.module';

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
    McpModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseActivity,
    HttpActivity,
    SentimentActivity,
    GenericLlmActivity,
    LangGraphActivity,
    LangGraphResearchActivity,
    McpClientService,
    RunActivity,
    WorkerService,
  ],
})
export class AppModule {}
