import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs') // Explicit table name ensures both repos map to same table
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // This links the log to the specific execution (runId)
  @Index()
  @Column()
  workflowRunId: string;

  // This links the log to your business logic ID (e.g. "wf_176...")
  @Index()
  @Column()
  workflowId: string;

  @Column()
  nodeId: string;

  @Column()
  nodeName: string;

  @Column()
  nodeType: string;

  @Column()
  status: 'STARTED' | 'COMPLETED' | 'FAILED';

  @Column('jsonb', { nullable: true })
  details: any; // Inputs, Outputs, Errors

  @CreateDateColumn()
  timestamp: Date;
}
