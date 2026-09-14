import { createModelExecutionResult } from './model-execution.js';
import type { ModelExecutionRequest, ModelExecutionResult } from './model-execution.js';
import type { ModelProviderAdapter } from './model-provider-adapter.js';
import type { ModelRequest } from './model-request.js';
import type { ModelTurn } from './model-turn.js';

export type ModelRequestNormalizer = (turn: ModelTurn) => ModelRequest;

export type ModelProviderExecutionExecutor = (
  request: ModelExecutionRequest,
) => Promise<ModelExecutionResult>;

export function createModelProviderExecutionExecutor(options: {
  readonly requestNormalizer: ModelRequestNormalizer;
  readonly providerAdapter: ModelProviderAdapter;
}): ModelProviderExecutionExecutor {
  const { requestNormalizer, providerAdapter } = options;

  return async (executionRequest) => {
    const request = requestNormalizer(executionRequest.turn);
    const response = await providerAdapter.execute({
      model: executionRequest.model,
      request,
    });

    return createModelExecutionResult(response);
  };
}
