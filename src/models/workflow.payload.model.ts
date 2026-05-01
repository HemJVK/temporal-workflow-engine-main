import { WorkflowState } from './workflow.state.model';
import { WorkflowStep } from './workflow.step.model';

export interface WorkflowPayload {
  workflowId: string;
  startAt: string;
  steps: Record<string, WorkflowStep>;
  userId?: string;
  userEmail?: string;  // Used as COMPOSIO_ENTITY_ID so emails send from the user's own Gmail
  initialState?: WorkflowState;
}
