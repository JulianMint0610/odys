import { defineModel } from './define-model.js';
import { DuplicateModelIdError } from './model-errors.js';
import type { ModelDefinition } from './model.js';

export interface ModelRegistry {
  register(model: ModelDefinition): ModelDefinition;
  get(modelId: string): ModelDefinition | undefined;
  has(modelId: string): boolean;
  list(): readonly ModelDefinition[];
}

class CoreModelRegistry implements ModelRegistry {
  readonly #models = new Map<string, ModelDefinition>();

  public register(model: ModelDefinition): ModelDefinition {
    const validModel = defineModel(model);
    const { id } = validModel;

    if (this.#models.has(id)) {
      throw new DuplicateModelIdError(id);
    }

    const registeredModel = Object.freeze({
      id: validModel.id,
      provider: validModel.provider,
      providerModelId: validModel.providerModelId,
    });

    this.#models.set(id, registeredModel);
    return registeredModel;
  }

  public get(modelId: string): ModelDefinition | undefined {
    return this.#models.get(modelId);
  }

  public has(modelId: string): boolean {
    return this.#models.has(modelId);
  }

  public list(): readonly ModelDefinition[] {
    return Object.freeze([...this.#models.values()]);
  }
}

export function createModelRegistry(): ModelRegistry {
  return new CoreModelRegistry();
}
