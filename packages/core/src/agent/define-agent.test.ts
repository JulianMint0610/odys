import { describe, expect, it } from 'vitest';

import { defineAgent, InvalidAgentDefinitionError, type AgentDefinition } from '../index.js';

const validDefinition: AgentDefinition = {
  id: 'example-agent',
  name: 'Example Agent',
  version: '0.1.0',
  description: 'A neutral Agent fixture.',
  responsibility: 'Exercise the Core Agent contract in tests.',
  allowedTools: [],
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
      allowedTools: [],
    });
  });

  it.each([
    { allowedTools: [], label: 'an empty allowlist' },
    { allowedTools: ['web.search'], label: 'one canonical Tool ID' },
    {
      allowedTools: ['files.read', 'code.execute'],
      label: 'multiple canonical Tool IDs',
    },
    { allowedTools: ['future.tool'], label: 'an unknown canonical Tool ID' },
  ])('accepts $label and preserves declaration order', ({ allowedTools }) => {
    const definition = defineAgent({ ...validDefinition, allowedTools });

    expect(definition.allowedTools).toBe(allowedTools);
    expect(definition.allowedTools).toEqual(allowedTools);
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

  it('requires allowedTools to be present', () => {
    const definition = { ...validDefinition } as Record<string, unknown>;
    delete definition.allowedTools;

    expect(() => defineAgent(definition as unknown as AgentDefinition)).toThrow(
      InvalidAgentDefinitionError,
    );
    expect(() => defineAgent(definition as unknown as AgentDefinition)).toThrow(
      'Invalid Agent definition: allowedTools must be an array',
    );
  });

  it.each([null, 'web.search', {}, 1])('rejects the non-array allowedTools value %j', (value) => {
    expect(() => defineAgent(runtimeDefinition({ allowedTools: value }))).toThrow(
      InvalidAgentDefinitionError,
    );
  });

  it.each([
    { allowedTools: [1], label: 'a numeric member' },
    { allowedTools: [null], label: 'a null member' },
    { allowedTools: [{}], label: 'an object member' },
    { allowedTools: ['Web.search'], label: 'an uppercase ID' },
    { allowedTools: ['web search'], label: 'an ID containing whitespace' },
    { allowedTools: ['web.*'], label: 'a wildcard ID' },
    { allowedTools: ['web..search'], label: 'a malformed ID' },
  ])('rejects $label', ({ allowedTools }) => {
    expect(() => defineAgent(runtimeDefinition({ allowedTools }))).toThrow(
      InvalidAgentDefinitionError,
    );
    expect(() => defineAgent(runtimeDefinition({ allowedTools }))).toThrow(
      'Invalid Agent definition: allowedTools must contain canonical Tool identifiers',
    );
  });

  it('rejects an exact duplicate Tool ID without normalizing the declaration', () => {
    expect(() =>
      defineAgent(
        runtimeDefinition({ allowedTools: ['files.read', 'code.execute', 'files.read'] }),
      ),
    ).toThrow(InvalidAgentDefinitionError);
    expect(() =>
      defineAgent(
        runtimeDefinition({ allowedTools: ['files.read', 'code.execute', 'files.read'] }),
      ),
    ).toThrow('Invalid Agent definition: allowedTools must not contain duplicates');
  });

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

  it('keeps the accepted Agent object and allowlist caller-owned', () => {
    const allowedTools = ['web.search'];
    const callerDefinition = { ...validDefinition, allowedTools };
    const definition = defineAgent(callerDefinition);

    expect(definition).toBe(callerDefinition);
    expect(definition.allowedTools).toBe(allowedTools);
    expect(Object.isFrozen(callerDefinition)).toBe(false);
    expect(Object.isFrozen(allowedTools)).toBe(false);

    allowedTools.push('future.tool');
    callerDefinition.name = 'Caller-mutated Agent';

    expect(definition.allowedTools).toEqual(['web.search', 'future.tool']);
    expect(definition.name).toBe('Caller-mutated Agent');
  });

  it('reports which field failed validation', () => {
    expect(() => defineAgent({ ...validDefinition, id: 'Example-Agent' })).toThrow(
      'Invalid Agent definition: id',
    );
  });
});
