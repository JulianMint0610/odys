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
  it('registers and returns a Registry-owned immutable Model snapshot', () => {
    const registry = createModelRegistry();
    const model = createTestModel('general');
    const registeredModel = registry.register(model);

    expect(registeredModel).toEqual(model);
    expect(registeredModel).not.toBe(model);
    expect(Object.isFrozen(registeredModel)).toBe(true);
    expect(Object.isFrozen(model)).toBe(false);
    expect(registry.has('general')).toBe(true);
  });

  it('retrieves a registered Model by its stable logical ID', () => {
    const registry = createModelRegistry();
    const model = createTestModel('general');

    const registeredModel = registry.register(model);

    expect(registry.get('general')).toBe(registeredModel);
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

    const registeredFirstModel = registry.register(firstModel);
    const registeredSecondModel = registry.register(secondModel);

    const listedModels = registry.list();

    expect(listedModels).toEqual([firstModel, secondModel]);
    expect(listedModels[0]).toBe(registeredFirstModel);
    expect(listedModels[1]).toBe(registeredSecondModel);
    expect(Object.isFrozen(listedModels)).toBe(true);
    expect(listedModels.every((model) => Object.isFrozen(model))).toBe(true);
    expect(registry.list()).not.toBe(listedModels);
  });

  it('isolates registered state from caller mutation', () => {
    const registry = createModelRegistry();
    const model = createTestModel('general');
    const registeredModel = registry.register(model);

    (model as { provider: string; providerModelId: string }).provider = 'mutated-provider';
    (model as { provider: string; providerModelId: string }).providerModelId = 'mutated/model';

    expect(registry.get('general')).toBe(registeredModel);
    expect(registry.get('general')).toEqual({
      id: 'general',
      provider: 'test-provider',
      providerModelId: 'provider/general:v1',
    });
    expect(registry.list()).toEqual([registeredModel]);
  });

  it('does not allow mutation of the registered Model snapshot', () => {
    const registry = createModelRegistry();
    const registeredModel = registry.register(createTestModel('general'));

    expect(() => {
      (registeredModel as { provider: string }).provider = 'mutated-provider';
    }).toThrow(TypeError);
    expect(registry.get('general')?.provider).toBe('test-provider');
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

    const registeredModel = registry.register(firstModel);

    expect(() => registry.register(duplicateModel)).toThrow(DuplicateModelIdError);
    expect(() => registry.register(duplicateModel)).toThrow(
      'Model with id "general" is already registered',
    );
    expect(registry.get('general')).toBe(registeredModel);
    expect(registry.list()).toEqual([registeredModel]);
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

    const registeredModel = registry.register(firstModel);

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidModelDefinitionError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicateModelIdError);
    expect(registry.get('general')).toBe(registeredModel);
  });

  it('keeps separate Registry instances isolated without hidden global state', () => {
    const firstRegistry = createModelRegistry();
    const secondRegistry = createModelRegistry();

    firstRegistry.register(createTestModel('general'));

    expect(firstRegistry.has('general')).toBe(true);
    expect(secondRegistry.has('general')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });

  it('creates isolated registered references for the same Model object', () => {
    const firstRegistry = createModelRegistry();
    const secondRegistry = createModelRegistry();
    const model = createTestModel('general');

    const firstRegisteredModel = firstRegistry.register(model);
    const secondRegisteredModel = secondRegistry.register(model);

    expect(firstRegisteredModel).not.toBe(model);
    expect(secondRegisteredModel).not.toBe(model);
    expect(firstRegisteredModel).not.toBe(secondRegisteredModel);
    expect(firstRegisteredModel).toEqual(model);
    expect(secondRegisteredModel).toEqual(model);
    expect(firstRegistry.get('general')).toBe(firstRegisteredModel);
    expect(secondRegistry.get('general')).toBe(secondRegisteredModel);
  });
});
