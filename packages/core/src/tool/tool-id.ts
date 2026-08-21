const toolIdPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function isCanonicalToolId(value: unknown): value is string {
  return typeof value === 'string' && toolIdPattern.test(value);
}
