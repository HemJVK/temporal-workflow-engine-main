import { IWorkflowTool } from './tool.interface';
import { resolveParams } from '../workflows/utils';
import { WorkflowState } from '../models/workflow.state.model';
import { AgentActivities } from '../models/activity.args.model';
import { WorkflowStep } from '../models/workflow.step.model';

export class PostgresTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running Postgres Tool...');

    // Resolve any {{variables}} inside the query (if you want to support dynamic queries)
    const params = resolveParams(node.params, state);

    if (!params.query) throw new Error('No SQL query provided');

    // 1. Execute the Activity
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
    const result = await activities.executeSqlQuery({
      query: params.query as string,
      params: [],
    });

    if (Array.isArray(result)) {
      return {
        rows: result,
        rowCount: result.length,
        success: true,
      };
    }

    return result as unknown;
  }
}
