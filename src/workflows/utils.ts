import { WorkflowState } from 'src/models/workflow.state.model';

export function resolveStateValue(state: WorkflowState, path: string): unknown {
  if (!path || typeof path !== 'string') return undefined;

  const parts = path.split('.');
  let rootKey = parts[0];

  // Fuzzy Match
  if (state[rootKey] === undefined) {
    const matchingKey = Object.keys(state).find((k) => k.startsWith(rootKey));
    if (matchingKey) rootKey = matchingKey;
  }

  let current: unknown = state[rootKey];
  for (let i = 1; i < parts.length; i++) {
    if (current === undefined || current === null) return undefined;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  return current;
}

export function resolveTemplate(
  template: string,
  state: WorkflowState,
): string {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, match: string) => {
    const val = resolveStateValue(state, match.trim());
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}

// Helper to resolve all params in a config object
export function resolveParams(
  params: Record<string, unknown>,
  state: WorkflowState,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] =
      typeof value === 'string' ? resolveTemplate(value, state) : value;
  }
  return resolved;
}

export function getErrorMessage(error: Error): string {
  return error instanceof Error ? error.message : String(error);
}
