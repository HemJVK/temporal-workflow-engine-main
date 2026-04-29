import { IWorkflowTool } from './tool.interface';
import { WorkflowState } from '../models/workflow.state.model';
import { AgentActivities } from '../models/activity.args.model';
import { resolveParams } from '../workflows/utils';
import { WorkflowStep } from '../models/workflow.step.model';

export class HttpTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    const params = resolveParams(node.params, state);
    console.log(
      `Running HTTP Tool [${String(params.method)}] ${String(params.url)}`,
    );

    // Logic specific to HTTP (Parsing JSON bodies)
    let parsedBody = params.body;
    if (
      ['POST', 'PUT', 'PATCH'].includes(String(params.method)) &&
      typeof params.body === 'string'
    ) {
      try {
        parsedBody = JSON.parse(params.body);
      } catch {
        /* keep as string */
      }
    }

    let headers = {};
    if (params.headers && typeof params.headers === 'string') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        headers = JSON.parse(params.headers);
      } catch {
        /* ignore */
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Langchain internal dynamic types / Third party library types
    return await activities.makeHttpRequest({
      method: String(params.method) as
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'GET'
        | 'DELETE',
      url: String(params.url),
      headers,
      body: parsedBody,
    });
  }
}
