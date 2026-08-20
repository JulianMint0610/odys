import { z } from 'zod';

import { InvalidToolDefinitionError } from './tool-errors.js';
import type { ToolDefinition } from './tool.js';

const toolIdPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const permissionIdPattern = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;
const toolRisks = new Set<unknown>(['low', 'medium', 'high', 'critical']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidDefinition(message: string): never {
  throw new InvalidToolDefinitionError(`Invalid Tool definition: ${message}`);
}

function validateNonEmptyString(
  definition: Record<string, unknown>,
  field: 'name' | 'description',
): void {
  const value = definition[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    rejectInvalidDefinition(`${field} must be a non-empty string`);
  }
}

function validateToolDefinition(definition: unknown): asserts definition is ToolDefinition {
  if (!isRecord(definition)) {
    rejectInvalidDefinition('definition must be an object');
  }

  if (typeof definition.id !== 'string' || !toolIdPattern.test(definition.id)) {
    rejectInvalidDefinition('id must be a canonical Tool identifier');
  }

  validateNonEmptyString(definition, 'name');
  validateNonEmptyString(definition, 'description');

  if (!toolRisks.has(definition.risk)) {
    rejectInvalidDefinition('risk must be a supported Tool risk');
  }

  if (!(definition.inputSchema instanceof z.ZodType)) {
    rejectInvalidDefinition('inputSchema must be a Zod schema');
  }

  if (!(definition.outputSchema instanceof z.ZodType)) {
    rejectInvalidDefinition('outputSchema must be a Zod schema');
  }

  if (!Array.isArray(definition.requiredPermissions)) {
    rejectInvalidDefinition('requiredPermissions must be an array');
  }

  const declaredPermissions = new Set<string>();

  for (const permissionId of definition.requiredPermissions) {
    if (typeof permissionId !== 'string' || !permissionIdPattern.test(permissionId)) {
      rejectInvalidDefinition('requiredPermissions must contain canonical permission identifiers');
    }

    if (declaredPermissions.has(permissionId)) {
      rejectInvalidDefinition('requiredPermissions must not contain duplicates');
    }

    declaredPermissions.add(permissionId);
  }
}

export function defineTool<
  TInputSchema extends z.ZodType = z.ZodType,
  TOutputSchema extends z.ZodType = z.ZodType,
>(
  definition: ToolDefinition<TInputSchema, TOutputSchema>,
): ToolDefinition<TInputSchema, TOutputSchema> {
  validateToolDefinition(definition);
  return definition;
}
