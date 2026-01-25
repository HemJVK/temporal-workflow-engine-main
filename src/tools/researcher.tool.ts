import { AgentActivities } from 'src/models/activity.args.model';
import { WorkflowState } from 'src/models/workflow.state.model';
import { WorkflowStep } from 'src/models/workflow.step.model';
import { IWorkflowTool } from './tool.interface';
import { resolveTemplate } from 'src/workflows/utils';

export class ResearcherTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running Research Subgraph Tool...');

    // 1. Resolve Topic
    const topic = resolveTemplate(node.params.topic, state);

    if (!topic) throw new Error('Research topic is missing');

    // 2. Call the Activity (which runs the LangGraph)
    const result = await activities.runResearchSubgraph({ topic });

    return result;
  }
}
