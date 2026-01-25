import { WorkflowState } from 'src/models/workflow.state.model';
import { IWorkflowTool } from './tool.interface';
import { WorkflowStep } from 'src/models/workflow.step.model';
import { AgentActivities } from 'src/models/activity.args.model';
import { resolveParams, resolveStateValue } from 'src/workflows/utils';

export class SendGridTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running SendGrid Email Tool...');

    // 1. Resolve Templates
    const params = resolveParams(node.params, state);

    let to = params.to;
    let subject = params.subject;
    const body = params.body || params.message;

    // 2. Restore "Magic" Variable Support (loopItem.mobile)
    if (to && !to.startsWith('+') && to.includes('.')) {
      const resolved = resolveStateValue(state, to);
      if (resolved) to = resolved;
    }

    // 3. Auto-Discovery Fallback
    if (!to) {
      const pgKey = Object.keys(state).find((k) => k.includes('postgres'));
      const rows = pgKey && (state[pgKey] as any)?.rows;
      if (rows && rows[0]?.phone) to = rows[0].phone;
    }

    // 4. Validate
    if (!to) throw new Error("Missing 'To' Phone Number");
    if (!body) throw new Error("Missing 'Message' Body");

    // ✅ FIX: Send 'body' instead of 'message' to match your Activity definition
    return await activities.sendEmail({
      to: String(to),
      subject: String(subject),
      body: String(body),
    });
  }
}
