import { Module } from '@nestjs/common';
import { DatabaseActivity } from './database.activity';
import { HttpActivity } from './http.activity';
import { AuditActivity } from '../audit/audit.activity';
import { GenericLlmActivity } from './ai/generic-llm.activity';
import { RunActivity } from './run.activity';
import { EntityModule } from 'src/entity/entity.module';
import { LangGraphActivity } from './ai/langgraph.activity';
import { McpClientService } from './ai/mcp-client.service';
import { LogicActivity } from './logic.activity';

@Module({
  imports: [EntityModule],
  providers: [
    DatabaseActivity,
    HttpActivity,
    AuditActivity,
    GenericLlmActivity,
    RunActivity,
    LangGraphActivity,
    McpClientService,
    LogicActivity,
  ],
  exports: [
    DatabaseActivity,
    HttpActivity,
    AuditActivity,
    GenericLlmActivity,
    RunActivity,
    LangGraphActivity,
    McpClientService,
    LogicActivity,
  ],
})
export class ActivitiesModule {}
