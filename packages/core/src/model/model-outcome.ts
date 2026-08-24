import { isCanonicalToolId } from '../tool/tool-id.js';

import { ModelOutcomeValidationError } from './model-errors.js';

export type ModelOutcome =
  | {
      readonly kind: 'final';
      readonly output: unknown;
    }
  | {
      readonly kind: 'tool-request';
      readonly toolId: string;
      readonly input: unknown;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidOutcome(message: string): never {
  throw new ModelOutcomeValidationError(`Invalid Model outcome: ${message}`);
}

export function parseModelOutcome(value: unknown): ModelOutcome {
  if (!isRecord(value)) {
    rejectInvalidOutcome('outcome must be an object');
  }

  if (!Object.hasOwn(value, 'kind')) {
    rejectInvalidOutcome('kind must be provided');
  }

  if (value.kind !== 'final' && value.kind !== 'tool-request') {
    rejectInvalidOutcome('kind must be "final" or "tool-request"');
  }

  if (value.kind === 'final') {
    if (!Object.hasOwn(value, 'output')) {
      rejectInvalidOutcome('output must be provided for a final outcome');
    }

    return Object.freeze({
      kind: 'final',
      output: value.output,
    });
  }

  if (!Object.hasOwn(value, 'toolId')) {
    rejectInvalidOutcome('toolId must be provided for a tool-request outcome');
  }

  if (!isCanonicalToolId(value.toolId)) {
    rejectInvalidOutcome('toolId must be a canonical Tool identifier');
  }

  if (!Object.hasOwn(value, 'input')) {
    rejectInvalidOutcome('input must be provided for a tool-request outcome');
  }

  return Object.freeze({
    kind: 'tool-request',
    toolId: value.toolId,
    input: value.input,
  });
}
