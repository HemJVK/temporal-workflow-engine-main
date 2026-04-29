import { AgentActivities } from '../models/activity.args.model';
import { WorkflowState } from '../models/workflow.state.model';
import { WorkflowStep } from '../models/workflow.step.model';

export interface IWorkflowTool {
  execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ): Promise<any>;
}
