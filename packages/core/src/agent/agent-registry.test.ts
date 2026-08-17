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
  it('registers and returns a Registry-owned immutable Agent snapshot', () => {
    const registry = createAgentRegistry();
    const agent = createTestAgent('example-agent');
    const registeredAgent = registry.register(agent);

    expect(registeredAgent).toEqual(agent);
    expect(registeredAgent).not.toBe(agent);
    expect(Object.isFrozen(registeredAgent)).toBe(true);
    expect(Object.isFrozen(agent)).toBe(false);
    expect(registry.has('example-agent')).toBe(true);
  });

  it('retrieves a registered Agent by its stable ID', () => {
    const registry = createAgentRegistry();
    const agent = createTestAgent('example-agent');

    const registeredAgent = registry.register(agent);

    expect(registry.get('example-agent')).toBe(registeredAgent);
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

    const registeredFirstAgent = registry.register(firstAgent);
    const registeredSecondAgent = registry.register(secondAgent);

    const listedAgents = registry.list();

    expect(listedAgents).toEqual([firstAgent, secondAgent]);
    expect(listedAgents[0]).toBe(registeredFirstAgent);
    expect(listedAgents[1]).toBe(registeredSecondAgent);
    expect(Object.isFrozen(listedAgents)).toBe(true);
    expect(listedAgents.every((agent) => Object.isFrozen(agent))).toBe(true);
    expect(registry.list()).not.toBe(listedAgents);
  });

  it('returns list snapshots that are not changed by later registrations', () => {
    const registry = createAgentRegistry();
    const firstAgent = createTestAgent('example-agent');

    registry.register(firstAgent);
    const listedAgents = registry.list();
    registry.register(createTestAgent('test-agent'));

    expect(listedAgents).toEqual([firstAgent]);
    expect(registry.list()).toHaveLength(2);
  });

  it('isolates registered state from caller mutation', () => {
    const registry = createAgentRegistry();
    const agent = createTestAgent('example-agent');
    const registeredAgent = registry.register(agent);

    (agent as { name: string }).name = 'Caller-mutated Agent';

    expect(registry.get('example-agent')).toBe(registeredAgent);
    expect(registry.get('example-agent')?.name).toBe('example-agent Agent');
    expect(registry.list()).toEqual([registeredAgent]);
  });

  it('does not allow mutation of the registered Agent snapshot', () => {
    const registry = createAgentRegistry();
    const registeredAgent = registry.register(createTestAgent('example-agent'));

    expect(() => {
      (registeredAgent as { name: string }).name = 'Mutated Agent';
    }).toThrow(TypeError);
    expect(registry.get('example-agent')?.name).toBe('example-agent Agent');
  });

  it('rejects duplicate Agent IDs without replacing the first registration', () => {
    const registry = createAgentRegistry();
    const firstAgent = createTestAgent('example-agent');
    const duplicateAgent = defineAgent({
      ...firstAgent,
      name: 'Replacement Agent',
    });

    const registeredAgent = registry.register(firstAgent);

    expect(() => registry.register(duplicateAgent)).toThrow(DuplicateAgentIdError);
    expect(() => registry.register(duplicateAgent)).toThrow(
      'Agent with id "example-agent" is already registered',
    );
    expect(registry.get('example-agent')).toBe(registeredAgent);
    expect(registry.list()).toEqual([registeredAgent]);
  });

  it('validates malformed runtime data before checking Registry invariants', () => {
    const registry = createAgentRegistry();
    const firstAgent = createTestAgent('example-agent');
    const malformedDuplicate = { ...firstAgent, name: '' } as AgentDefinition;

    const registeredAgent = registry.register(firstAgent);

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidAgentDefinitionError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicateAgentIdError);
    expect(registry.get('example-agent')).toBe(registeredAgent);
  });

  it('keeps separate Registry instances and their registered references isolated', () => {
    const firstRegistry = createAgentRegistry();
    const secondRegistry = createAgentRegistry();
    const agent = createTestAgent('example-agent');

    const firstRegisteredAgent = firstRegistry.register(agent);
    const secondRegisteredAgent = secondRegistry.register(agent);

    expect(firstRegistry.has('example-agent')).toBe(true);
    expect(secondRegistry.has('example-agent')).toBe(true);
    expect(firstRegisteredAgent).not.toBe(agent);
    expect(secondRegisteredAgent).not.toBe(agent);
    expect(firstRegisteredAgent).not.toBe(secondRegisteredAgent);
    expect(firstRegisteredAgent).toEqual(agent);
    expect(secondRegisteredAgent).toEqual(agent);
    expect(firstRegistry.get('example-agent')).toBe(firstRegisteredAgent);
    expect(secondRegistry.get('example-agent')).toBe(secondRegisteredAgent);
  });

  it('keeps separate Registry containers independent', () => {
    const firstRegistry = createAgentRegistry();
    const secondRegistry = createAgentRegistry();

    firstRegistry.register(createTestAgent('example-agent'));

    expect(firstRegistry.has('example-agent')).toBe(true);
    expect(secondRegistry.has('example-agent')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });
});
