import { AgentActivities } from '../models/activity.args.model';
import { WorkflowState } from '../models/workflow.state.model';
import { WorkflowStep } from '../models/workflow.step.model';
import { IWorkflowTool } from './tool.interface';
import { resolveParams } from '../workflows/utils';

export class SentimentAnalysisTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running LangGraph Sentiment Agent...');
    const params = resolveParams(node.params, state);

    const result = await activities.runSentimentAnalysis({
      query: params.query as string,
    });

    state[node.id] = result;
  }
}
