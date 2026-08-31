import type { ModelToolRequest } from './model-outcome.js';

export type ModelTurn =
  | {
      readonly kind: 'initial';
      readonly input: unknown;
    }
  | {
      readonly kind: 'tool-result';
      readonly input: unknown;
      readonly toolRequest: ModelToolRequest;
      readonly toolResult: unknown;
    };

export function createInitialModelTurn(
  input: unknown,
): Extract<ModelTurn, { readonly kind: 'initial' }> {
  return Object.freeze({ kind: 'initial', input });
}

export function createToolResultModelTurn(options: {
  readonly input: unknown;
  readonly toolRequest: ModelToolRequest;
  readonly toolResult: unknown;
}): Extract<ModelTurn, { readonly kind: 'tool-result' }> {
  return Object.freeze({
    kind: 'tool-result',
    input: options.input,
    toolRequest: options.toolRequest,
    toolResult: options.toolResult,
  });
}
