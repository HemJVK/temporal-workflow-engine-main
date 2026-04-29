import { IWorkflowTool } from './tool.interface';
import { WorkflowState } from '../models/workflow.state.model';
import { AgentActivities } from '../models/activity.args.model';
import { WorkflowStep } from '../models/workflow.step.model';
import { resolveTemplate } from '../workflows/utils';

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
    const systemPrompt = resolveTemplate(
      node.params.systemPrompt as string,
      state,
    );
    // Fallback: templates often use 'prompt' instead of 'userPrompt'
    const userPromptRaw = (node.params.userPrompt ||
      node.params.prompt) as string;
    const userPrompt = resolveTemplate(userPromptRaw, state);

    // 2. Call Activity
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
    const result = await activities.runAgent({
      systemPrompt: systemPrompt || 'You are a helpful assistant.',
      userPrompt: userPrompt || '',
      modelName: (node.params.model as string) || 'gpt-4o',
      outputFields: node.params.outputFields as
        | {
            name: string;
            description: string;
            type: 'string' | 'number' | 'boolean';
          }[]
        | undefined,
      boundTools: node.params.boundTools as string[],
      mcpServers: node.params.mcpServers as string[],
    });

    return result as unknown;
  }
}
