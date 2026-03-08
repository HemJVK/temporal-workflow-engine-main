import { IWorkflowTool } from './tool.interface';
import { WorkflowState } from 'src/models/workflow.state.model';
import { AgentActivities } from 'src/models/activity.args.model';
import { resolveParams } from 'src/workflows/utils';
import { WorkflowStep } from 'src/models/workflow.step.model';

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
        headers = JSON.parse(params.headers);
      } catch {
        /* ignore */
      }
    }

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
