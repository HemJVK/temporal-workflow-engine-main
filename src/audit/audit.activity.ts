import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from 'src/audit/audit-log.entity';

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
      details: args.details || {},
    });
  }
}
