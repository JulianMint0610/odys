import type { ToolDefinition } from './tool.js';

export interface ToolPermissionRequirementResult {
  readonly satisfied: boolean;
  readonly missingPermissions: readonly string[];
}

export function evaluateToolPermissionRequirements(
  definition: ToolDefinition,
  resolvedPermissions: readonly string[],
): ToolPermissionRequirementResult {
  const resolvedPermissionSet = new Set(resolvedPermissions);
  const missingPermissions = Object.freeze(
    definition.requiredPermissions.filter(
      (requiredPermission) => !resolvedPermissionSet.has(requiredPermission),
    ),
  );

  return Object.freeze({
    satisfied: missingPermissions.length === 0,
    missingPermissions,
  });
}
