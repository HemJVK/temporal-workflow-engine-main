import { NodeType } from 'src/entity/workflow.types';

export interface WorkflowStep {
  id: string;
  type: NodeType;
  name: string;
  params: Record<string, any>;
  next: string | null;
  branches?: Record<string, string>;
}
