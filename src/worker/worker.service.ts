import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';

import { Worker } from '@temporalio/worker';

import { DatabaseActivity } from '../activities/database.activity';
import { ConfigService } from '@nestjs/config';
import { EmailActivity } from 'src/activities/email.activity';
import { SmsActivity } from 'src/activities/sms.activity';
import { HttpActivity } from 'src/activities/http.activity';
import { AuditActivity } from 'src/audit/audit.activity';
import { GenericLlmActivity } from 'src/activities/ai/generic-llm.activity';
import { LangGraphResearchActivity } from 'src/activities/ai/research-activity';
import { RunActivity } from 'src/activities/run.activity';
import { VoiceCallActivity } from 'src/activities/voice-call.activity';

@Injectable()
export class WorkerService implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker;

  constructor(
    private readonly dbActivities: DatabaseActivity,
    private readonly emailActivities: EmailActivity,
    private readonly smsActivities: SmsActivity,
    private readonly httpActivities: HttpActivity,
    private readonly configService: ConfigService,
    private readonly auditActivities: AuditActivity,
    private readonly genericLLMActivities: GenericLlmActivity,
    private readonly researchActivities: LangGraphResearchActivity,
    private readonly runActivities: RunActivity,
    private readonly voiceCallActivities: VoiceCallActivity,
  ) {}

  async onModuleInit() {
    const workflowsPath = require.resolve('../workflows/interpreter.workflow');
    const taskQueue = this.configService.get<string>('temporal.taskQueue');

    const activities = {
      executeSqlQuery: this.dbActivities.executeSqlQuery.bind(
        this.dbActivities,
      ),
      sendEmail: this.emailActivities.sendEmail.bind(this.emailActivities),
      sendSmsActivity: this.smsActivities.sendSmsActivity.bind(
        this.smsActivities,
      ),
      makeHttpRequest: this.httpActivities.makeHttpRequest.bind(
        this.httpActivities,
      ),
      logStep: this.auditActivities.logStep.bind(this.auditActivities),
      runLlm: this.genericLLMActivities.runLlm.bind(this.genericLLMActivities),
      runResearchSubgraph: this.researchActivities.runResearchSubgraph.bind(
        this.researchActivities,
      ),
      updateRunStatus: this.runActivities.updateRunStatus.bind(
        this.runActivities,
      ),
      makeNotificationCall: this.voiceCallActivities.makeNotificationCall.bind(
        this.voiceCallActivities,
      ),
      makeConversationCall:
        this.voiceCallActivities.makeConversationalCall.bind(
          this.voiceCallActivities,
        ),
    };

    // 3. Create the Worker
    this.worker = await Worker.create({
      workflowsPath: workflowsPath,
      taskQueue: taskQueue!,
      activities: activities,
      maxConcurrentActivityTaskExecutions: 50,
      maxConcurrentWorkflowTaskExecutions: 50,
    });

    console.log(
      '🚀 Agentic Workflow Engine Worker started. Ready for workflows!',
    );

    // 4. Start the worker (non-blocking)
    await this.worker.run();
  }

  onApplicationShutdown() {
    this.worker?.shutdown();
  }
}
