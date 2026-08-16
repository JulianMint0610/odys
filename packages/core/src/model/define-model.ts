import { InvalidModelDefinitionError } from './model-errors.js';
import { isCanonicalModelId, isCanonicalModelProviderId } from './model-id.js';
import type { ModelDefinition } from './model.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidDefinition(message: string): never {
  throw new InvalidModelDefinitionError(`Invalid Model definition: ${message}`);
}

function validateModelDefinition(definition: unknown): asserts definition is ModelDefinition {
  if (!isRecord(definition)) {
    rejectInvalidDefinition('definition must be an object');
  }

  if (!isCanonicalModelId(definition.id)) {
    rejectInvalidDefinition('id must be a canonical Model identifier');
  }

  if (!isCanonicalModelProviderId(definition.provider)) {
    rejectInvalidDefinition('provider must be a canonical provider identifier');
  }

  if (
    typeof definition.providerModelId !== 'string' ||
    definition.providerModelId.trim().length === 0
  ) {
    rejectInvalidDefinition('providerModelId must be a non-empty string');
  }
}

export function defineModel(definition: ModelDefinition): ModelDefinition {
  validateModelDefinition(definition);
  return definition;
}
