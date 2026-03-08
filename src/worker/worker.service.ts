import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';

import { Worker } from '@temporalio/worker';

import { DatabaseActivity } from '../activities/database.activity';
import { ConfigService } from '@nestjs/config';
import { HttpActivity } from 'src/activities/http.activity';
import { AuditActivity } from 'src/audit/audit.activity';
import { LangGraphActivity } from 'src/activities/ai/langgraph.activity';
import { LangGraphResearchActivity } from 'src/activities/ai/research-activity';
import { RunActivity } from 'src/activities/run.activity';

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
