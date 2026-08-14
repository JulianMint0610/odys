const agentIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function isCanonicalAgentId(value: unknown): value is string {
  return typeof value === 'string' && agentIdPattern.test(value);
}
