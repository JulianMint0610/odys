import { describe, expect, it } from 'vitest';

import {
  createAgentRegistry,
  defineAgent,
  DuplicateAgentIdError,
  InvalidAgentDefinitionError,
  type AgentDefinition,
} from '../index.js';

function createTestAgent(id: string): AgentDefinition {
  return defineAgent({
    id,
    name: `${id} Agent`,
    version: '0.1.0',
    description: `Fixture for ${id}.`,
    responsibility: `Test the ${id} registration path.`,
  });
}

describe('Agent Registry', () => {
  it('registers and returns a valid Agent', () => {
    const registry = createAgentRegistry();
    const agent = createTestAgent('example-agent');

    expect(registry.register(agent)).toBe(agent);
    expect(registry.has('example-agent')).toBe(true);
  });

  it('retrieves a registered Agent by its stable ID', () => {
    const registry = createAgentRegistry();
    const agent = createTestAgent('example-agent');

    registry.register(agent);

    expect(registry.get('example-agent')).toBe(agent);
  });

  it('reports an unknown Agent ID explicitly', () => {
    const registry = createAgentRegistry();

    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists registered Agents in insertion order without exposing mutable Registry state', () => {
    const registry = createAgentRegistry();
    const firstAgent = createTestAgent('example-agent');
    const secondAgent = createTestAgent('test-agent');

    registry.register(firstAgent);
    registry.register(secondAgent);

    const listedAgents = registry.list();

    expect(listedAgents).toEqual([firstAgent, secondAgent]);
    expect(Object.isFrozen(listedAgents)).toBe(true);
  });

  it('rejects duplicate Agent IDs without replacing the first registration', () => {
    const registry = createAgentRegistry();
    const firstAgent = createTestAgent('example-agent');
    const duplicateAgent = defineAgent({
      ...firstAgent,
      name: 'Replacement Agent',
    });

    registry.register(firstAgent);

    expect(() => registry.register(duplicateAgent)).toThrow(DuplicateAgentIdError);
    expect(() => registry.register(duplicateAgent)).toThrow(
      'Agent with id "example-agent" is already registered',
    );
    expect(registry.get('example-agent')).toBe(firstAgent);
    expect(registry.list()).toEqual([firstAgent]);
  });

  it('validates malformed runtime data before checking Registry invariants', () => {
    const registry = createAgentRegistry();
    const firstAgent = createTestAgent('example-agent');
    const malformedDuplicate = { ...firstAgent, name: '' } as AgentDefinition;

    registry.register(firstAgent);

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidAgentDefinitionError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicateAgentIdError);
    expect(registry.get('example-agent')).toBe(firstAgent);
  });

  it('keeps separate Registry instances isolated without hidden global state', () => {
    const firstRegistry = createAgentRegistry();
    const secondRegistry = createAgentRegistry();

    firstRegistry.register(createTestAgent('example-agent'));

    expect(firstRegistry.has('example-agent')).toBe(true);
    expect(secondRegistry.has('example-agent')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });
});
