import { describe, expect, it } from 'vitest';

import {
  createToolRegistry,
  defineTool,
  DuplicateToolIdError,
  InvalidToolDefinitionError,
  type ToolDefinition,
} from '../index.js';

function createTestTool(id: string): ToolDefinition {
  return defineTool({
    id,
    name: `${id} Tool`,
    description: `Fixture for ${id}.`,
    risk: 'low',
  });
}

describe('Tool Registry', () => {
  it('registers and returns a valid Tool', () => {
    const registry = createToolRegistry();
    const tool = createTestTool('web.search');

    expect(registry.register(tool)).toBe(tool);
    expect(registry.has('web.search')).toBe(true);
  });

  it('retrieves a registered Tool by its stable ID', () => {
    const registry = createToolRegistry();
    const tool = createTestTool('web.search');

    registry.register(tool);

    expect(registry.get('web.search')).toBe(tool);
  });

  it('reports an unknown Tool ID explicitly', () => {
    const registry = createToolRegistry();

    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists registered Tools in insertion order without exposing mutable Registry state', () => {
    const registry = createToolRegistry();
    const firstTool = createTestTool('web.search');
    const secondTool = createTestTool('email.read');

    registry.register(firstTool);
    registry.register(secondTool);

    const listedTools = registry.list();

    expect(listedTools).toEqual([firstTool, secondTool]);
    expect(Object.isFrozen(listedTools)).toBe(true);
    expect(registry.list()).not.toBe(listedTools);
  });

  it('returns list snapshots that are not changed by later registrations', () => {
    const registry = createToolRegistry();
    const firstTool = createTestTool('web.search');

    registry.register(firstTool);
    const listedTools = registry.list();
    registry.register(createTestTool('email.read'));

    expect(listedTools).toEqual([firstTool]);
    expect(registry.list()).toHaveLength(2);
  });

  it('rejects duplicate Tool IDs without replacing the first registration', () => {
    const registry = createToolRegistry();
    const firstTool = createTestTool('web.search');
    const duplicateTool = defineTool({
      ...firstTool,
      name: 'Replacement Web Search Tool',
    });

    registry.register(firstTool);

    expect(() => registry.register(duplicateTool)).toThrow(DuplicateToolIdError);
    expect(() => registry.register(duplicateTool)).toThrow(
      'Tool with id "web.search" is already registered',
    );
    expect(registry.get('web.search')).toBe(firstTool);
    expect(registry.list()).toEqual([firstTool]);
  });

  it('validates malformed runtime data before checking Registry invariants', () => {
    const registry = createToolRegistry();
    const firstTool = createTestTool('web.search');
    const malformedDuplicate = { ...firstTool, name: '' } as ToolDefinition;

    registry.register(firstTool);

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidToolDefinitionError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicateToolIdError);
    expect(registry.get('web.search')).toBe(firstTool);
  });

  it('keeps separate Registry instances isolated without hidden global state', () => {
    const firstRegistry = createToolRegistry();
    const secondRegistry = createToolRegistry();

    firstRegistry.register(createTestTool('web.search'));

    expect(firstRegistry.has('web.search')).toBe(true);
    expect(secondRegistry.has('web.search')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });

  it('allows the same Tool ID in separate Registry instances', () => {
    const firstRegistry = createToolRegistry();
    const secondRegistry = createToolRegistry();
    const firstTool = createTestTool('web.search');
    const secondTool = createTestTool('web.search');

    expect(() => firstRegistry.register(firstTool)).not.toThrow();
    expect(() => secondRegistry.register(secondTool)).not.toThrow();
    expect(firstRegistry.get('web.search')).toBe(firstTool);
    expect(secondRegistry.get('web.search')).toBe(secondTool);
  });
});
