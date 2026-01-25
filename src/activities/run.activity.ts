import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkflowRun } from 'src/entity/workflow-run.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RunActivity {
  constructor(
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
  ) {}

  async updateRunStatus(args: {
    runId: string; // The Temporal Run ID
    status: 'COMPLETED' | 'FAILED';
    output?: any;
    error?: string;
  }) {
    console.log(`[DB] Updating Run ${args.runId} -> ${args.status}`);

    await this.runRepo.update(
      { temporalRunId: args.runId },
      {
        status: args.status,
        output: args.output || null,
        error: args.error || null,
        completedAt: new Date(),
      },
    );
  }
}
