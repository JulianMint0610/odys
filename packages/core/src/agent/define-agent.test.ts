import { describe, expect, it } from 'vitest';

import { defineAgent, InvalidAgentDefinitionError, type AgentDefinition } from '../index.js';

const validDefinition: AgentDefinition = {
  id: 'example-agent',
  name: 'Example Agent',
  version: '0.1.0',
  description: 'A neutral Agent fixture.',
  responsibility: 'Exercise the Core Agent contract in tests.',
};

function runtimeDefinition(overrides: Record<string, unknown>): AgentDefinition {
  return { ...validDefinition, ...overrides } as AgentDefinition;
}

describe('defineAgent', () => {
  it('defines a valid Agent and preserves every public metadata field', () => {
    const definition = defineAgent(validDefinition);

    expect(definition).toBe(validDefinition);
    expect(definition).toEqual({
      id: 'example-agent',
      name: 'Example Agent',
      version: '0.1.0',
      description: 'A neutral Agent fixture.',
      responsibility: 'Exercise the Core Agent contract in tests.',
    });
  });

  it.each(['test-agent', 'research-assistant-2', 'agent2'])(
    'allows the canonical Agent id %s',
    (id) => {
      expect(() => defineAgent({ ...validDefinition, id })).not.toThrow();
    },
  );

  it.each([
    ['', 'an empty id'],
    ['   ', 'only whitespace'],
    ['Test-agent', 'an uppercase letter'],
    ['test_agent', 'an underscore'],
    ['test.agent', 'a period'],
    ['/test-agent', 'a slash'],
    ['-test-agent', 'a leading hyphen'],
    ['test-agent-', 'a trailing hyphen'],
    ['test--agent', 'a repeated hyphen'],
    [' test-agent', 'leading whitespace'],
    ['test-agent ', 'trailing whitespace'],
  ])('rejects Agent id %j containing %s', (id) => {
    expect(() => defineAgent({ ...validDefinition, id })).toThrow(InvalidAgentDefinitionError);
  });

  it.each(['name', 'version', 'description', 'responsibility'] as const)(
    'rejects a missing or invalid %s',
    (field) => {
      const missingDefinition = { ...validDefinition } as Record<string, unknown>;
      delete missingDefinition[field];

      expect(() => defineAgent(missingDefinition as unknown as AgentDefinition)).toThrow(
        InvalidAgentDefinitionError,
      );
      expect(() => defineAgent(runtimeDefinition({ [field]: '' }))).toThrow(
        InvalidAgentDefinitionError,
      );
      expect(() => defineAgent(runtimeDefinition({ [field]: '   ' }))).toThrow(
        InvalidAgentDefinitionError,
      );
      expect(() => defineAgent(runtimeDefinition({ [field]: null }))).toThrow(
        InvalidAgentDefinitionError,
      );
    },
  );

  it.each([null, 1, [], {}])(
    'rejects a malformed runtime definition without leaking an incidental TypeError',
    (definition) => {
      expect(() => defineAgent(definition as unknown as AgentDefinition)).toThrow(
        InvalidAgentDefinitionError,
      );
    },
  );

  it('does not normalize accepted metadata', () => {
    const definition = defineAgent({
      ...validDefinition,
      name: ' Example Agent ',
      description: ' Description ',
      responsibility: ' Responsibility ',
    });

    expect(definition.name).toBe(' Example Agent ');
    expect(definition.description).toBe(' Description ');
    expect(definition.responsibility).toBe(' Responsibility ');
  });

  it('reports which field failed validation', () => {
    expect(() => defineAgent({ ...validDefinition, id: 'Example-Agent' })).toThrow(
      'Invalid Agent definition: id',
    );
  });
});
