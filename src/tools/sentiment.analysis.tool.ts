import { AgentActivities } from 'src/models/activity.args.model';
import { WorkflowState } from 'src/models/workflow.state.model';
import { WorkflowStep } from 'src/models/workflow.step.model';
import { IWorkflowTool } from './tool.interface';
import { resolveParams } from 'src/workflows/utils';

export class SentimentAnalysisTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running LangGraph Sentiment Agent...');
    const params = resolveParams(node.params, state);

    const result = await activities.runSentimentAnalysis({
      query: params.query,
    });

    state[node.id] = result;
  }
}
