import { describe, expect, it } from 'vitest';

import { defineModel, InvalidModelDefinitionError, type ModelDefinition } from '../index.js';

const validDefinition: ModelDefinition = {
  id: 'general-reasoning',
  provider: 'openai',
  providerModelId: 'gpt-5.2-2025-12-11',
};

function runtimeDefinition(overrides: Record<string, unknown>): ModelDefinition {
  return { ...validDefinition, ...overrides } as ModelDefinition;
}

describe('defineModel', () => {
  it('defines a valid Model and preserves every public metadata field', () => {
    const definition = defineModel(validDefinition);

    expect(definition).toBe(validDefinition);
    expect(definition).toEqual({
      id: 'general-reasoning',
      provider: 'openai',
      providerModelId: 'gpt-5.2-2025-12-11',
    });
  });

  it.each(['general', 'general-reasoning', 'reasoning.primary', 'coding_primary'])(
    'allows the canonical Model id %s',
    (id) => {
      expect(() => defineModel({ ...validDefinition, id })).not.toThrow();
    },
  );

  it.each([
    ['', 'an empty id'],
    ['   ', 'only whitespace'],
    ['General', 'an uppercase letter'],
    ['.general', 'a leading separator'],
    ['general.', 'a trailing separator'],
    ['general..reasoning', 'a repeated separator'],
    ['general reasoning', 'a space'],
    ['general/', 'a slash'],
    ['-general', 'a leading hyphen'],
    [' general', 'leading whitespace'],
    ['general ', 'trailing whitespace'],
  ])('rejects Model id %j containing %s', (id) => {
    expect(() => defineModel({ ...validDefinition, id })).toThrow(InvalidModelDefinitionError);
  });

  it.each([
    { label: 'a missing id', value: undefined, missing: true },
    { label: 'a null id', value: null },
    { label: 'a numeric id', value: 1 },
    { label: 'an object id', value: {} },
  ])('rejects $label', ({ value, missing }) => {
    const definition = runtimeDefinition({ id: value });

    if (missing === true) {
      delete (definition as unknown as Record<string, unknown>).id;
    }

    expect(() => defineModel(definition)).toThrow(InvalidModelDefinitionError);
  });

  it.each(['openai', 'anthropic', 'google', 'azure-openai', 'aws.bedrock'])(
    'allows the canonical provider id %s',
    (provider) => {
      expect(() => defineModel({ ...validDefinition, provider })).not.toThrow();
    },
  );

  it.each([
    { label: 'a missing provider', value: undefined, missing: true },
    { label: 'an empty provider', value: '' },
    { label: 'a whitespace-only provider', value: '   ' },
    { label: 'an uppercase provider', value: 'OpenAI' },
    { label: 'a leading separator', value: '-openai' },
    { label: 'a trailing separator', value: 'openai-' },
    { label: 'a repeated separator', value: 'azure--openai' },
    { label: 'a provider containing a slash', value: 'cloud/provider' },
    { label: 'a null provider', value: null },
    { label: 'a numeric provider', value: 1 },
  ])('rejects $label', ({ value, missing }) => {
    const definition = runtimeDefinition({ provider: value });

    if (missing === true) {
      delete (definition as unknown as Record<string, unknown>).provider;
    }

    expect(() => defineModel(definition)).toThrow(InvalidModelDefinitionError);
  });

  it.each([
    { label: 'a missing providerModelId', value: undefined, missing: true },
    { label: 'an empty providerModelId', value: '' },
    { label: 'a whitespace-only providerModelId', value: '   ' },
    { label: 'a null providerModelId', value: null },
    { label: 'a numeric providerModelId', value: 1 },
    { label: 'an object providerModelId', value: {} },
  ])('rejects $label', ({ value, missing }) => {
    const definition = runtimeDefinition({ providerModelId: value });

    if (missing === true) {
      delete (definition as unknown as Record<string, unknown>).providerModelId;
    }

    expect(() => defineModel(definition)).toThrow(InvalidModelDefinitionError);
  });

  it.each(['GPT-5.2:2025/12/11', 'models/gemini_3.0-pro', 'claude.opus-4_6'])(
    'preserves the opaque provider-owned model id %s',
    (providerModelId) => {
      const definition = defineModel({ ...validDefinition, providerModelId });

      expect(definition.providerModelId).toBe(providerModelId);
    },
  );

  it.each([null, 1, [], {}])(
    'rejects a malformed runtime definition without leaking an incidental TypeError',
    (definition) => {
      expect(() => defineModel(definition as unknown as ModelDefinition)).toThrow(
        InvalidModelDefinitionError,
      );
    },
  );

  it('does not normalize accepted provider metadata', () => {
    const definition = defineModel({
      ...validDefinition,
      providerModelId: ' Provider/Model:V1 ',
    });

    expect(definition.providerModelId).toBe(' Provider/Model:V1 ');
  });

  it('reports which field failed validation', () => {
    expect(() => defineModel({ ...validDefinition, id: 'General' })).toThrow(
      'Invalid Model definition: id',
    );
    expect(() => defineModel({ ...validDefinition, provider: 'OpenAI' })).toThrow(
      'Invalid Model definition: provider',
    );
    expect(() => defineModel({ ...validDefinition, providerModelId: '' })).toThrow(
      'Invalid Model definition: providerModelId',
    );
  });
});
