import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from '../audit/audit-log.entity';

@Injectable()
export class AuditActivity {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async logStep(args: {
    workflowRunId: string;
    workflowId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: 'STARTED' | 'COMPLETED' | 'FAILED';
    details?: any;
  }) {
    await this.auditRepo.save({
      ...args,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
      details: args.details || {},
    });
  }
}
