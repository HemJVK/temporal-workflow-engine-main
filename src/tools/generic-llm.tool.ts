import { IWorkflowTool } from './tool.interface';
import { WorkflowState } from 'src/models/workflow.state.model';
import { AgentActivities } from 'src/models/activity.args.model';
import { WorkflowStep } from 'src/models/workflow.step.model';
import { resolveTemplate } from 'src/workflows/utils';

export class GenericLlmTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running Generic LLM Tool...');

    if (!node.params.systemPrompt && !node.params.userPrompt) {
      throw new Error('Either systemPrompt or userPrompt must be provided.');
    }

    // 1. Resolve Templates
    const systemPrompt = resolveTemplate(node.params.systemPrompt, state);
    const userPrompt = resolveTemplate(node.params.userPrompt, state);

    // 2. Call Activity
    const result = await activities.runLlm({
      systemPrompt: systemPrompt || 'You are a helpful assistant.',
      userPrompt: userPrompt || '',
      modelName: node.params.model || 'gpt-4o',
      outputFields: node.params.outputFields,
      boundTools: node.params.boundTools,
    });

    return result;
  }
}
