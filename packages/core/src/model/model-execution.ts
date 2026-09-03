import type { ModelTurn } from './model-turn.js';
import type { ModelDefinition } from './model.js';

export interface ModelExecutionRequest {
  readonly model: ModelDefinition;
  readonly turn: ModelTurn;
}

export interface ModelExecutionResult {
  readonly output: unknown;
}

export function createModelExecutionRequest(options: ModelExecutionRequest): ModelExecutionRequest {
  return Object.freeze({
    model: options.model,
    turn: options.turn,
  });
}

export function createModelExecutionResult(output: unknown): ModelExecutionResult {
  return Object.freeze({ output });
}
