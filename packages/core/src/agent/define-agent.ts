import { InvalidAgentDefinitionError } from './agent-errors.js';
import { isCanonicalAgentId } from './agent-id.js';
import type { AgentDefinition } from './agent.js';
import { isCanonicalToolId } from '../tool/tool-id.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidDefinition(message: string): never {
  throw new InvalidAgentDefinitionError(`Invalid Agent definition: ${message}`);
}

function validateNonEmptyString(
  definition: Record<string, unknown>,
  field: keyof AgentDefinition,
): void {
  const value = definition[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    rejectInvalidDefinition(`${field} must be a non-empty string`);
  }
}

function validateAgentDefinition(definition: unknown): asserts definition is AgentDefinition {
  if (!isRecord(definition)) {
    rejectInvalidDefinition('definition must be an object');
  }

  if (!isCanonicalAgentId(definition.id)) {
    rejectInvalidDefinition('id must be a canonical Agent identifier');
  }

  validateNonEmptyString(definition, 'name');
  validateNonEmptyString(definition, 'version');
  validateNonEmptyString(definition, 'description');
  validateNonEmptyString(definition, 'responsibility');

  if (!Array.isArray(definition.allowedTools)) {
    rejectInvalidDefinition('allowedTools must be an array');
  }

  const declaredTools = new Set<string>();

  for (const toolId of definition.allowedTools) {
    if (!isCanonicalToolId(toolId)) {
      rejectInvalidDefinition('allowedTools must contain canonical Tool identifiers');
    }

    if (declaredTools.has(toolId)) {
      rejectInvalidDefinition('allowedTools must not contain duplicates');
    }

    declaredTools.add(toolId);
  }
}

export function defineAgent(definition: AgentDefinition): AgentDefinition {
  validateAgentDefinition(definition);
  return definition;
}
