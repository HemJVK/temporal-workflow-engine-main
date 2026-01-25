import { WorkflowState } from 'src/models/workflow.state.model';
import { IWorkflowTool } from './tool.interface';
import { WorkflowStep } from 'src/models/workflow.step.model';
import { AgentActivities } from 'src/models/activity.args.model';
import {
  resolveParams,
  resolveStateValue,
  resolveTemplate,
} from 'src/workflows/utils';

export class TwilioTool implements IWorkflowTool {
  async execute(
    node: WorkflowStep,
    state: WorkflowState,
    activities: AgentActivities,
  ) {
    console.log('Running Twilio SMS Tool...');

    // 1. Resolve Templates
    const params = resolveParams(node.params, state);

    let to = params.to;
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

    if (node.type === 'make_notification_call_twilio') {
      return await activities.makeNotificationCall({
        to: String(to),
        message: params.message || 'Hello, This is a test message.',
      });
    } else if (node.type === 'make_conversation_call_twilio') {
      const { runId, workflowId } = workflowInfo();

      const prompt = resolveTemplate(node.params.systemPrompt, state);

      // 1. Start the Call
      console.log(
        '[Interpreter] Call initiated. Waiting for user to finish talking...',
      );

      return await activities.makeConversationalCallTwilio({
        to,
        systemPrompt: prompt,
        callbackUrl: 'https://your-api.com/api/callbacks/voice',
        metadata: { workflowId, runId, nodeId: node.id },
      });
    }

    return await activities.sendSmsActivity({
      to: String(to),
      body: String(body),
    });
  }
}
