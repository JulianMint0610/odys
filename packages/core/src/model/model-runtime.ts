import { InvalidModelRuntimeRequestError, UnknownModelError } from './model-errors.js';
import { isCanonicalModelId } from './model-id.js';
import type { ModelRegistry } from './model-registry.js';
import type { ModelDefinition } from './model.js';

export interface ModelRuntimeRequest {
  readonly modelId: string;
  readonly input: unknown;
}

export interface ModelRuntimeResult {
  readonly modelId: string;
  readonly output: unknown;
}

export type ModelRuntimeExecutor = (request: {
  readonly model: ModelDefinition;
  readonly input: unknown;
}) => Promise<unknown>;

export interface ModelRuntime {
  run(request: ModelRuntimeRequest): Promise<ModelRuntimeResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidRequest(message: string): never {
  throw new InvalidModelRuntimeRequestError(`Invalid Model runtime request: ${message}`);
}

function validateModelRuntimeRequest(request: unknown): asserts request is ModelRuntimeRequest {
  if (!isRecord(request)) {
    rejectInvalidRequest('request must be an object');
  }

  if (!isCanonicalModelId(request.modelId)) {
    rejectInvalidRequest('modelId must be a canonical Model identifier');
  }

  if (!Object.hasOwn(request, 'input')) {
    rejectInvalidRequest('input must be provided');
  }
}

class CoreModelRuntime implements ModelRuntime {
  readonly #modelRegistry: ModelRegistry;
  readonly #executor: ModelRuntimeExecutor;

  public constructor(modelRegistry: ModelRegistry, executor: ModelRuntimeExecutor) {
    this.#modelRegistry = modelRegistry;
    this.#executor = executor;
  }

  public async run(request: ModelRuntimeRequest): Promise<ModelRuntimeResult> {
    validateModelRuntimeRequest(request);

    const model = this.#modelRegistry.get(request.modelId);

    if (model === undefined) {
      throw new UnknownModelError(request.modelId);
    }

    const output = await this.#executor({ model, input: request.input });

    return {
      modelId: model.id,
      output,
    };
  }
}

export function createModelRuntime(options: {
  readonly modelRegistry: ModelRegistry;
  readonly executor: ModelRuntimeExecutor;
}): ModelRuntime {
  return new CoreModelRuntime(options.modelRegistry, options.executor);
}
