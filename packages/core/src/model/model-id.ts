const modelIdPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function isCanonicalModelId(value: unknown): value is string {
  return typeof value === 'string' && modelIdPattern.test(value);
}

export function isCanonicalModelProviderId(value: unknown): value is string {
  return typeof value === 'string' && modelIdPattern.test(value);
}
