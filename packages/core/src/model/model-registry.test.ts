import { describe, expect, it } from 'vitest';

import {
  createModelRegistry,
  defineModel,
  DuplicateModelIdError,
  InvalidModelDefinitionError,
  type ModelDefinition,
} from '../index.js';

function createTestModel(id: string): ModelDefinition {
  return defineModel({
    id,
    provider: 'test-provider',
    providerModelId: `provider/${id}:v1`,
  });
}

describe('Model Registry', () => {
  it('registers and returns a valid Model', () => {
    const registry = createModelRegistry();
    const model = createTestModel('general');

    expect(registry.register(model)).toBe(model);
    expect(registry.has('general')).toBe(true);
  });

  it('retrieves a registered Model by its stable logical ID', () => {
    const registry = createModelRegistry();
    const model = createTestModel('general');

    registry.register(model);

    expect(registry.get('general')).toBe(model);
  });

  it('reports an unknown Model ID without adding provider-specific lookup behavior', () => {
    const registry = createModelRegistry();

    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists registered Models in insertion order without exposing mutable Registry state', () => {
    const registry = createModelRegistry();
    const firstModel = createTestModel('general');
    const secondModel = createTestModel('coding.primary');

    registry.register(firstModel);
    registry.register(secondModel);

    const listedModels = registry.list();

    expect(listedModels).toEqual([firstModel, secondModel]);
    expect(Object.isFrozen(listedModels)).toBe(true);
    expect(registry.list()).not.toBe(listedModels);
  });

  it('returns list snapshots that are not changed by later registrations', () => {
    const registry = createModelRegistry();
    const firstModel = createTestModel('general');

    registry.register(firstModel);
    const listedModels = registry.list();
    registry.register(createTestModel('coding.primary'));

    expect(listedModels).toEqual([firstModel]);
    expect(registry.list()).toHaveLength(2);
  });

  it('rejects duplicate logical Model IDs without replacing the first registration', () => {
    const registry = createModelRegistry();
    const firstModel = createTestModel('general');
    const duplicateModel = defineModel({
      ...firstModel,
      provider: 'replacement-provider',
      providerModelId: 'replacement/model',
    });

    registry.register(firstModel);

    expect(() => registry.register(duplicateModel)).toThrow(DuplicateModelIdError);
    expect(() => registry.register(duplicateModel)).toThrow(
      'Model with id "general" is already registered',
    );
    expect(registry.get('general')).toBe(firstModel);
    expect(registry.list()).toEqual([firstModel]);
  });

  it('revalidates a definition before checking Registry invariants', () => {
    const registry = createModelRegistry();
    const model = createTestModel('general');
    const mutableModel = model as { providerModelId: string };

    mutableModel.providerModelId = '';

    expect(() => registry.register(model)).toThrow(InvalidModelDefinitionError);
    expect(() => registry.register(model)).not.toThrow(DuplicateModelIdError);
    expect(registry.has('general')).toBe(false);
  });

  it('validates malformed duplicate data before checking duplicate IDs', () => {
    const registry = createModelRegistry();
    const firstModel = createTestModel('general');
    const malformedDuplicate = { ...firstModel, provider: 'Invalid Provider' } as ModelDefinition;

    registry.register(firstModel);

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidModelDefinitionError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicateModelIdError);
    expect(registry.get('general')).toBe(firstModel);
  });

  it('keeps separate Registry instances isolated without hidden global state', () => {
    const firstRegistry = createModelRegistry();
    const secondRegistry = createModelRegistry();

    firstRegistry.register(createTestModel('general'));

    expect(firstRegistry.has('general')).toBe(true);
    expect(secondRegistry.has('general')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });

  it('allows the same Model ID in separate Registry instances', () => {
    const firstRegistry = createModelRegistry();
    const secondRegistry = createModelRegistry();
    const firstModel = createTestModel('general');
    const secondModel = createTestModel('general');

    expect(() => firstRegistry.register(firstModel)).not.toThrow();
    expect(() => secondRegistry.register(secondModel)).not.toThrow();
    expect(firstRegistry.get('general')).toBe(firstModel);
    expect(secondRegistry.get('general')).toBe(secondModel);
  });
});
