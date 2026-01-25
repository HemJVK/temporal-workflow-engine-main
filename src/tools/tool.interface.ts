import { AgentActivities } from 'src/models/activity.args.model';
import { WorkflowState } from 'src/models/workflow.state.model';
import { WorkflowStep } from 'src/models/workflow.step.model';

export interface IWorkflowTool {
  execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ): Promise<any>;
}
