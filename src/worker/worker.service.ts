import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';

import { Worker } from '@temporalio/worker';

import { DatabaseActivity } from '../activities/database.activity';
import { ConfigService } from '@nestjs/config';
import { HttpActivity } from '../activities/http.activity';
import { AuditActivity } from '../audit/audit.activity';
import { LangGraphActivity } from '../activities/ai/langgraph.activity';
import { LangGraphResearchActivity } from '../activities/ai/research-activity';
import { RunActivity } from '../activities/run.activity';
import { CreditActivity } from '../activities/credit.activity';
import { GenericLlmActivity } from '../activities/ai/generic-llm.activity';

@Injectable()
export class WorkerService implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker;

  constructor(
    private readonly dbActivities: DatabaseActivity,
    private readonly httpActivities: HttpActivity,
    private readonly configService: ConfigService,
    private readonly auditActivities: AuditActivity,
    private readonly langGraphActivities: LangGraphActivity,
    private readonly researchActivities: LangGraphResearchActivity,
    private readonly runActivities: RunActivity,
    private readonly creditActivities: CreditActivity,
    private readonly llmActivities: GenericLlmActivity,
  ) {}

  async onModuleInit() {
    const workflowsPath = require.resolve('../workflows/interpreter.workflow');
    const taskQueue = this.configService.get<string>('temporal.taskQueue');

    // Use type assertion for the activities object explicitly or let TS infer if we wrap it properly.
    // However, the cleanest way to fix `Unsafe assignment of an any value`
    // is to just cast or omit .bind if it complains, or assert the signature.
    // Actually the lint error is likely because `this.dbActivities.executeSqlQuery` itself is typed with `any`.
    // Let's assert the entire activities object.
    const activities: Record<string, (...args: never[]) => unknown> = {
      executeSqlQuery: this.dbActivities.executeSqlQuery.bind(
        this.dbActivities,
      ) as (...args: never[]) => unknown,
      makeHttpRequest: this.httpActivities.makeHttpRequest.bind(
        this.httpActivities,
      ) as (...args: never[]) => unknown,
      logStep: this.auditActivities.logStep.bind(this.auditActivities) as (
        ...args: never[]
      ) => unknown,
      runAgent: this.langGraphActivities.runAgent.bind(
        this.langGraphActivities,
      ) as (...args: never[]) => unknown,
      runResearchSubgraph: this.researchActivities.runResearchSubgraph.bind(
        this.researchActivities,
      ) as (...args: never[]) => unknown,
      updateRunStatus: this.runActivities.updateRunStatus.bind(
        this.runActivities,
      ) as (...args: never[]) => unknown,
      checkPreflightCredits: this.creditActivities.checkPreflightCredits.bind(
        this.creditActivities,
      ) as (...args: never[]) => unknown,
      deductExactCredits: this.creditActivities.deductExactCredits.bind(
        this.creditActivities,
      ) as (...args: never[]) => unknown,
      refundCredits: this.creditActivities.refundCredits.bind(
        this.creditActivities,
      ) as (...args: never[]) => unknown,
      executePrompt: this.llmActivities.runLlm.bind(this.llmActivities) as (
        ...args: never[]
      ) => unknown,
      runLlm: this.llmActivities.runLlm.bind(this.llmActivities) as (
        ...args: never[]
      ) => unknown,
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
    // IMPORTANT: In NestJS, worker.run() is an async loop that blocks forever.
    // We must NOT await it here or NestJS will never finish bootstrapping and app.listen() will never be called.
    this.worker.run().catch((err) => {
      console.error('❌ Temporal Worker failed to start:', err);
    });
  }

  onApplicationShutdown() {
    this.worker?.shutdown();
  }
}
