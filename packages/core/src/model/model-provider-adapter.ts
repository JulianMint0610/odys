import type { ModelRequest } from './model-request.js';
import type { ModelResponse } from './model-response.js';
import type { ModelDefinition } from './model.js';

export interface ModelProviderAdapterRequest {
  readonly model: ModelDefinition;
  readonly request: ModelRequest;
}

export interface ModelProviderAdapter {
  execute(request: ModelProviderAdapterRequest): Promise<ModelResponse>;
}
