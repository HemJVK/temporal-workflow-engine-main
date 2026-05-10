import { WorkflowState } from './workflow.state.model';
import { WorkflowStep } from './workflow.step.model';

export interface WorkflowPayload {
  workflowId: string;
  startAt: string;
  steps: Record<string, WorkflowStep>;
  userId?: string;
  initialState?: WorkflowState;
}
