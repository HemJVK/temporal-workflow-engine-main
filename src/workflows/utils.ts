import { WorkflowState } from 'src/models/workflow.state.model';

export function resolveStateValue(state: WorkflowState, path: string): any {
  if (!path || typeof path !== 'string') return undefined;

  const parts = path.split('.');
  let rootKey = parts[0];

  // Fuzzy Match
  if (state[rootKey] === undefined) {
    const matchingKey = Object.keys(state).find((k) => k.startsWith(rootKey));
    if (matchingKey) rootKey = matchingKey;
  }

  let current: any = state[rootKey];
  for (let i = 1; i < parts.length; i++) {
    if (current === undefined || current === null) return undefined;
    current = current[parts[i]];
  }
  return current;
}

export function resolveTemplate(
  template: string,
  state: WorkflowState,
): string {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, match) => {
    const val = resolveStateValue(state, match.trim());
    return val !== undefined ? String(val) : '';
  });
}

// Helper to resolve all params in a config object
export function resolveParams(
  params: Record<string, any>,
  state: WorkflowState,
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] =
      typeof value === 'string' ? resolveTemplate(value, state) : value;
  }
  return resolved;
}

export function getErrorMessage(error: Error): string {
  return error instanceof Error ? error.message : String(error);
}
