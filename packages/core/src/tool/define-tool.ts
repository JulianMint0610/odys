import { z } from 'zod';

import { InvalidToolDefinitionError } from './tool-errors.js';
import type { ToolDefinition } from './tool.js';

const toolIdPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
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
}

export function defineTool<TSchema extends z.ZodType>(
  definition: ToolDefinition<TSchema>,
): ToolDefinition<TSchema> {
  validateToolDefinition(definition);
  return definition;
}
