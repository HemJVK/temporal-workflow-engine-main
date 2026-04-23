import {
  workflowInfo,
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  sleep,
  executeChild,
} from '@temporalio/workflow';
import { AgentActivities } from 'src/models/activity.args.model';
import { WorkflowPayload } from 'src/models/workflow.payload.model';
import { WorkflowState } from 'src/models/workflow.state.model';
import { WorkflowStep } from 'src/models/workflow.step.model';
import { ToolRegistry } from 'src/tools/tool.registry';
import { CreditActivity } from 'src/activities/credit.activity';
import { getErrorMessage, resolveTemplate } from './utils';

// ---------------------------------------------------------------------------
// 1. IMPORTS & INTERFACES
// ---------------------------------------------------------------------------

// Define Signals & Queries
export const webhookSignal = defineSignal<[unknown]>('WEBHOOK_TRIGGER');
export const voiceCallbackSignal = defineSignal<[any]>('VOICE_CALLBACK');

export const getStatusQuery = defineQuery('GET_STATUS');

// Configure Activities
const activities = proxyActivities<AgentActivities & CreditActivity>({
  startToCloseTimeout: '3 minutes',
  retry: {
    // 1. If we hit an error, wait 1 second before retrying
    initialInterval: '1s',
    // 2. Exponential backoff (1s, 2s, 4s, 8s...)
    backoffCoefficient: 2,
    // 3. Cap the wait time at 1 minute
    maximumInterval: '1m',
    // 4. Try indefinitely (or set maximumAttempts)
    maximumAttempts: 5,
    // 5. DO NOT RETRY on logic errors, ONLY on network/rate limits
    nonRetryableErrorTypes: ['Error', 'TypeError'],
  },
});

// ---------------------------------------------------------------------------
// 2. MAIN INTERPRETER WORKFLOW
// ---------------------------------------------------------------------------

export async function InterpreterWorkflow(payload: WorkflowPayload) {
  const wf_info = workflowInfo();
  // console.log(
  //   '[Interpreter] Starting workflow execution with payload:',
  //   payload,
  // );
  // for (const stepId in payload.steps) {
  //   console.log(
  //     `[Interpreter] Step '${stepId}':`,
  //     JSON.stringify(payload.steps[stepId]),
  //   );
  // }
  let currentNodeId: string | null = payload.startAt;
  let voiceCallData: { nodeId: string; data: unknown } | null = null;

  // Initialize State (inject initialState if coming from a parent Loop)
  const workflowState: WorkflowState = payload.initialState || {};

  let webhookData: unknown = null;

  // Track Status for UI Polling
  const nodeStatuses: Record<
    string,
    'pending' | 'running' | 'completed' | 'failed'
  > = {};
  Object.keys(payload.steps).forEach((id) => (nodeStatuses[id] = 'pending'));

  // Setup Handlers
  setHandler(getStatusQuery, () => nodeStatuses);
  setHandler(webhookSignal, (data) => {
    console.log('[Interpreter] Received Webhook Signal:', data);
    webhookData = data;
  });
  setHandler(voiceCallbackSignal, (payload: unknown) => {
    // Payload: { nodeId: '...', data: { ... } }
    // We store it so the specific node can read it
    voiceCallData = payload as { nodeId: string; data: unknown };
  });

  // --- CREDIT PREFLIGHT ---
  if (payload.userId) {
    console.log(`[Interpreter] Performing credit preflight for user: ${payload.userId}`);
    await activities.checkPreflightCredits(payload.userId, 0.01);
  }

  // --- THE EVENT LOOP ---
  while (currentNodeId) {
    const node: WorkflowStep = payload.steps[currentNodeId];

    if (!node) break;

    console.log(
      `[Interpreter] Executing Node '${currentNodeId}' of type '${node?.type}'`,
    );
    nodeStatuses[node.id] = 'running';

    await activities.logStep({
      workflowRunId: wf_info.runId,
      workflowId: payload.workflowId,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'STARTED',
      details: { params: node.params }, // Log inputs
    });

    try {
      // A. Check if this is a Tool (Strategy Pattern)
      console.log(`\nABOUT TO PROCESS NODE: ${node.type}`);
      const toolStrategy = ToolRegistry.getTool(node.type);

      if (toolStrategy) {
        // Delegate execution to the specific Tool Class (Postgres, Twilio, etc.)
        console.log(`Execute Tool Strategy for : ${node.type}`);

        const result = await toolStrategy.execute(
          node,
          workflowState,
          activities,
        );

        // Store result in state (e.g., workflowState['tool_postgres_123'] = { rows: [] })
        if (result !== undefined) {
          workflowState[node.id] = result;
        }

        // --- CREDIT DEDUCTION (Baseline for AI Tools) ---
        if (payload.userId && ['tool_generic_llm', 'ai_agent', 'tool_sentiment_analysis', 'agent_researcher'].includes(node.type)) {
          console.log(`[Interpreter] Deducting credits for AI node: ${node.type}`);
          // FIXME: Use real token counts once activities support it
          await activities.deductExactCredits(
            payload.userId,
            100, // Dummy prompt tokens
            100, // Dummy completion tokens
            'baseline-ai-model',
            payload.workflowId
          );
        }
        if (node.type == 'make_conversation_call_twilio') {
          // 2. PAUSE WORKFLOW: Wait until we receive the Signal matching this Node ID
          await condition(
            () => voiceCallData !== null && voiceCallData.nodeId === node.id,
          );

          // 3. Resume and Save Data
          console.log(
            '[Interpreter] Call Finished! Data received:',
            (voiceCallData as any)?.data,
          );

          // Save the answers (e.g. { budget: "10k", interest: "high" })
          if (voiceCallData && (voiceCallData as any).data) {
            workflowState[node.id] = (voiceCallData as any).data;
          }

          // Reset for next call
          voiceCallData = null;
        }
      }

      // B. Handle Native Flow Control Nodes
      else if (node.type === 'trigger_start') {
        // Only wait if we don't have data yet (e.g. passed from parent)
        if (!webhookData && !payload.initialState) {
          console.log('[Interpreter] Waiting for webhook signal...');
          await condition(() => webhookData !== null);
        }
        // Save webhook data if available
        if (webhookData) workflowState[node.id] = webhookData;
        console.log('[Interpreter] Webhook data received:', webhookData);
      } else if (node.type === 'logic_wait') {
        const duration = node.params.duration || '5s';
        console.log(`[Interpreter] Sleeping for ${duration}...`);
        await sleep(duration);
      } else if (node.type === 'logic_parallel') {
        console.log('Starting Parallel Fan-Out...');

        // 1. Identify all branches to run
        // node.branches = { "b_123": "email_node_id", "b_456": "sms_node_id" }
        const branchTargets = Object.values(node.branches || {});

        if (branchTargets.length === 0) {
          console.warn('Parallel node has no connections.');
        } else {
          // 2. Launch Child Workflows in Parallel (Fan-Out)
          const promises = branchTargets.map((startNodeId) => {
            const childPayload: WorkflowPayload = {
              ...payload, // Pass full graph definition
              startAt: startNodeId, // Start at the specific branch head
              initialState: { ...workflowState }, // Pass current state copy
            };

            return executeChild(InterpreterWorkflow, {
              args: [childPayload],
              // Use 'cancellationType' if you want to cancel all if one fails
            });
          });

          // 3. Wait for All to Complete (Fan-In)
          console.log(`[Parallel] Waiting for ${promises.length} branches...`);
          const results = await Promise.all(promises);

          // 4. Merge State (Optional)
          // If branches modified state, we might want to merge it back.
          // Simple strategy: Merge top-level keys.
          results.forEach((childResult: any) => {
            if (childResult?.state) {
              Object.assign(workflowState, childResult.state);
            }
          });

          console.log('[Parallel] Fan-In Complete. Merged State.');
          console.log(
            '[Parallel] Merged Keys:',
            JSON.stringify(Object.keys(workflowState)),
          );
        }

        // 5. Move to 'next' (The node connected to the bottom handle, if any)
        // Note: You might need to add a "Merge/Next" handle to your UI component
        // or just assume linear flow continues after the parallel block.
        currentNodeId = node.next;
      } else if (node.type === 'trigger_end') {
        console.log('End Node reached. Calculating final output...');

        let finalOutput: unknown = workflowState;

        // 1. If user defined a specific output template
        if (node.params?.output) {
          // Resolve templates inside the output string
          const resolvedOutput = resolveTemplate(
            node.params.output,
            workflowState,
          );

          console.log(`resolvedOutput: ${resolvedOutput}`);

          try {
            // Try to parse as JSON if it looks like JSON
            finalOutput = JSON.parse(resolvedOutput);
          } catch {
            // Otherwise return as simple string
            finalOutput = resolvedOutput;
          }
        }

        nodeStatuses[node.id] = 'completed';

        // 2. ✅ TRIGGER SAVE: Update DB to COMPLETED
        await activities.updateRunStatus({
          runId: wf_info.runId,
          status: 'COMPLETED',
          output: finalOutput,
        });

        // 2. STOP WORKFLOW AND RETURN
        return {
          status: 'COMPLETED',
          state: workflowState,
          output: finalOutput,
        };
      }

      // Calculate where to go next (Linear, Branch, or Loop)
      currentNodeId = await determineNextNode(node, workflowState, payload);

      nodeStatuses[node.id] = 'completed';

      await activities.logStep({
        workflowRunId: wf_info.runId,
        workflowId: payload.workflowId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: 'COMPLETED',
        details: { output: workflowState[node.id] },
      });
    } catch (error) {
      console.error(`[Interpreter] Error in node ${node.id}:`, error);
      const errorMessage = getErrorMessage(error);
      nodeStatuses[node.id] = 'failed';

      await activities.updateRunStatus({
        runId: wf_info.runId,
        status: 'FAILED',
        error: errorMessage,
      });

      // Stop execution on error (or add error handling logic here)
      await activities.logStep({
        workflowRunId: wf_info.runId,
        workflowId: payload.workflowId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: 'FAILED',
        details: { error: errorMessage },
      });
      throw error;
    }
  }

  return { status: 'COMPLETED', state: workflowState };
}

async function determineNextNode(
  node: WorkflowStep,
  state: WorkflowState,
  fullPayload: WorkflowPayload,
): Promise<string | null> {
  console.log(
    `[Flow] Determining next node from '${node.id}' of type '${node.type}'`,
  );
  // --- A. CONDITIONS (Binary True/False) ---
  if (node.type === 'logic_condition') {
    const { variable, operator, value } = node.params;
    const actualValue = resolveStateValue(state, variable);
    const isTrue = compareValues(actualValue, operator, value);

    return isTrue
      ? node.branches?.['true'] || null
      : node.branches?.['false'] || null;
  }

  // --- B. ROUTER (Multi-Path with Auto-Discovery) ---
  if (node.type === 'logic_router') {
    const { variable, routes } = node.params;

    // Smart Lookup: Checks Loop Item -> Global State -> DB Row 0
    const actualValue = findRouterValue(variable, state);

    console.log(`[Router] Evaluating ${variable}. Found value: ${actualValue}`);

    if (routes && Array.isArray(routes)) {
      for (const route of routes as {
        operator: string;
        value: unknown;
        id: string;
      }[]) {
        console.log(
          `[Router] Checking Rule: ${route.operator} ${String(route.value)}`,
        );
        const match = compareValues(actualValue, route.operator, route.value);
        console.log(`[Router] Match Result: ${match}`);
        if (match) {
          console.log(
            `[Router] Matched Rule: ${route.operator} ${String(route.value)}, ${String(actualValue)}`,
          );
          return node.branches?.[route.id] || null;
        } else {
          console.log(
            `[Router] Did not match Rule: ${route.operator} ${String(route.value)}, ${String(actualValue)}`,
          );
        }
      }
    }
    // Fallback
    return node.branches?.['default'] || null;
  }

  // --- C. LOOP (Recursive Child Workflow) ---
  if (node.type === 'logic_loop') {
    const arrayPath = node.params.variable;
    const arrayData = resolveStateValue(state, arrayPath);

    const isParallel = node.params.executionType === 'Parallel';
    console.log(`isParallel: ${isParallel}`);

    let batchSize = 10;
    if (
      node.params.batchSize &&
      !Number.isNaN(Number.parseInt(node.params.batchSize))
    ) {
      batchSize = Number.parseInt(node.params.batchSize);
      console.log(`[Loop] Using batchSize: ${batchSize}`);
    } else {
      console.log(`[Loop] Using default batchSize: ${batchSize}`);
    }

    if (Array.isArray(arrayData)) {
      console.log(`[Loop] Iterating over ${arrayData.length} items`);
      if (isParallel) {
        console.log(
          `[Loop] Parallel Mode: Processing ${arrayData.length} items in batches of ${batchSize}`,
        );

        // 2. Loop through the array in chunks
        for (let i = 0; i < arrayData.length; i += batchSize) {
          const batch = arrayData.slice(i, i + batchSize);

          console.log(`[Loop] Starting Batch ${i / batchSize + 1}`);

          const promises = batch.map((item) => {
            console.log(`[Loop] Processing item: ${JSON.stringify(item)}`);

            // Construct Payload for Child
            const childPayload = {
              ...fullPayload,
              startAt: node.branches?.['body'] || '',
              initialState: { ...state, loopItem: item },
            };
            return executeChild(InterpreterWorkflow, { args: [childPayload] });
          });

          // 3. Wait for THIS batch to finish before starting the next
          await Promise.all(promises);
        }
      } else {
        for (const item of arrayData) {
          // Construct Payload for Child
          const childPayload: WorkflowPayload = {
            ...fullPayload,
            startAt: node.branches?.['body'] || '', // Start inside the loop
            initialState: {
              ...state, // Parent Context
              loopItem: item, // Inject Current Item
            },
          };

          // Run Child Workflow synchronously (one by one)
          if (childPayload.startAt) {
            await executeChild(InterpreterWorkflow, {
              args: [childPayload],
              // Optional: taskQueue: 'agentic-workflow-queue'
            });
          }
        }
      }
    } else {
      console.warn(`[Loop] Variable '${arrayPath}' is not an array. Skipping.`);
    }

    // After loop finishes, go to 'done'
    return node.branches?.['done'] || null;
  }

  // --- D. LINEAR FLOW ---
  return node.next;
}

// ---------------------------------------------------------------------------
// 4. HELPER FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Resolves dot-notation paths from state.
 * Includes "Fuzzy Matching" to handle dynamic node IDs (e.g. "tool_postgres" -> "tool_postgres_1765...")
 */
function resolveStateValue(state: WorkflowState, path: string): unknown {
  console.log(`[State] Resolving path: '${path}'`);
  console.log('[State] Current state keys:', JSON.stringify(state));
  if (!path || typeof path !== 'string') return undefined;

  const parts = path.split('.');
  let rootKey = parts[0];

  // 1. Try Exact Match
  if (state[rootKey] === undefined) {
    // 2. Fuzzy Match: Find key starting with requested name
    const matchingKey = Object.keys(state).find((k) => k.startsWith(rootKey));
    if (matchingKey) {
      rootKey = matchingKey; // Found "tool_postgres_123"
    }
  }

  let current: unknown = state[rootKey];
  for (let i = 1; i < parts.length; i++) {
    if (current === undefined || current === null) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[parts[i]];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Smart Value Finder for Router Logic.
 * 1. Checks Loop Context
 * 2. Checks Global State
 * 3. Fallback: Checks First Row of a DB Result
 */
function findRouterValue(variable: string, state: WorkflowState): unknown {
  // 1. Check Loop Context
  if (state['loopItem']) {
    const loopVal = resolveStateValue(
      state['loopItem'] as WorkflowState,
      variable,
    );
    console.log(`[Router] Loop Context Value for '${variable}':`, loopVal);
    if (loopVal !== undefined) return loopVal;
  }

  // 2. Check Global State
  const globalVal = resolveStateValue(state, variable);
  console.log(`[Router] Global State Value for '${variable}':`, globalVal);
  if (globalVal !== undefined) return globalVal;

  // 3. Fallback: Check DB Rows (Auto-discovery)
  const dbKey = Object.keys(state).find(
    (k) =>
      state[k] &&
      typeof state[k] === 'object' &&
      'rows' in (state[k] as Record<string, unknown>),
  );
  if (dbKey) {
    const rows = (state[dbKey] as Record<string, unknown>).rows;
    console.log(`[Router] Fallback DB Rows for '${variable}':`, rows);
    if (Array.isArray(rows) && rows.length > 0 && String(variable) in rows[0]) {
      return (rows[0] as Record<string, unknown>)[variable];
    }
  }

  return undefined;
}

/**
 * Logic Comparison Helper
 */
function compareValues(
  actual: unknown,
  operator: string,
  target: unknown,
): boolean {
  console.log(
    `[Compare] Comparing actual: ${typeof actual}('${String(actual)}') vs target: ${typeof target}('${String(target)}') with '${operator}'`,
  );

  // 1. Normalize Booleans
  // If actual is Boolean (true) and target is String ("true"), convert target to Boolean
  if (typeof actual === 'boolean' && typeof target === 'string') {
    if (target.toLowerCase() === 'true') {
      target = true;
    } else if (target.toLowerCase() === 'false') {
      target = false;
    }
  }
  // Reverse case (just to be safe)
  if (typeof target === 'boolean' && typeof actual === 'string') {
    if (actual.toLowerCase() === 'true') {
      actual = true;
    } else if (actual.toLowerCase() === 'false') {
      actual = false;
    }
  }

  // 2. Normalize Numbers
  // This is required for "95" > "80" to work correctly mathematically
  if (
    !isNaN(Number(actual)) &&
    !isNaN(Number(target)) &&
    actual !== '' &&
    target !== '' &&
    actual !== null &&
    target !== null &&
    // Ensure we don't treat booleans as numbers here (true == 1) unless desired
    typeof actual !== 'boolean' &&
    typeof target !== 'boolean'
  ) {
    actual = Number(actual);
    target = Number(target);
  }

  let match = false;

  // 3. Perform Comparison
  switch (operator) {
    case '==':
      match = actual == target;
      break;
    case '!=':
      match = actual != target;
      break;
    case '>':
      match = (actual as number) > (target as number);
      break;
    case '<':
      match = (actual as number) < (target as number);
      break;
    case '>=':
      match = (actual as number) >= (target as number);
      break;
    case '<=':
      match = (actual as number) <= (target as number);
      break;
    case 'contains':
      match = String(actual).includes(String(target));
      break;
    default:
      match = false;
  }

  console.log(`[Compare] Result: ${match}`);

  return match;
}
