import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowRun } from './workflow-run.entity';
import { WorkflowEdge, WorkflowNode } from './workflow.types';

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  workflowId: string;

  @Column()
  name: string;

  // -----------------------------------------------------------------
  // 1. LIFECYCLE STATE
  // -----------------------------------------------------------------

  // ✅ ADD THIS: Tracks UI State (Draft vs Published)
  @Column({ default: 'DRAFT' })
  status: string;

  // ✅ KEEP THIS: Tracks Execution State (On/Off switch)
  @Column({ default: false })
  isActive: boolean;

  // -----------------------------------------------------------------
  // 2. BLUEPRINT (UI Editor State)
  // -----------------------------------------------------------------
  @Column('jsonb', { default: [] })
  nodes: WorkflowNode[];

  @Column('jsonb', { default: [] })
  edges: WorkflowEdge[];

  // -----------------------------------------------------------------
  // 3. EXECUTION SNAPSHOT (The "Compiled" Version)
  // -----------------------------------------------------------------
  @Column('jsonb', { nullable: true })
  deployedGraph: {
    steps: Record<string, any>;
    startAt: string;
  } | null;

  // -----------------------------------------------------------------
  // 4. TRIGGER CONFIG
  // -----------------------------------------------------------------
  @Column({ default: 'WEBHOOK' })
  triggerType: 'WEBHOOK' | 'SCHEDULE' | 'MANUAL';

  @Column({ type: 'text', nullable: true })
  cronExpression: string | null;

  // -----------------------------------------------------------------
  // 5. HISTORY
  // -----------------------------------------------------------------
  @OneToMany(() => WorkflowRun, (run) => run.definition)
  runs: WorkflowRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
