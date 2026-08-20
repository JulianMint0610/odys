import { z } from 'zod';
import { describe, expect, expectTypeOf, it } from 'vitest';

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
    inputSchema: z.object({ value: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    requiredPermissions: ['web.read'],
  });
}

describe('Tool Registry', () => {
  it('registers and returns a Registry-owned immutable Tool snapshot', () => {
    const registry = createToolRegistry();
    const tool = createTestTool('web.search');
    const registeredTool = registry.register(tool);

    expect(registeredTool).toEqual(tool);
    expect(registeredTool).not.toBe(tool);
    expect(Object.isFrozen(registeredTool)).toBe(true);
    expect(registeredTool.requiredPermissions).toEqual(['web.read']);
    expect(registeredTool.requiredPermissions).not.toBe(tool.requiredPermissions);
    expect(Object.isFrozen(registeredTool.requiredPermissions)).toBe(true);
    expect(Object.isFrozen(tool)).toBe(false);
    expect(Object.isFrozen(tool.requiredPermissions)).toBe(false);
    expect(registry.has('web.search')).toBe(true);
  });

  it('preserves explicit input-schema-only register generic compatibility', () => {
    const inputSchema = z.object({ value: z.string() });
    const outputSchema = z.object({ result: z.string() });
    const tool = defineTool({
      id: 'generic.compatibility',
      name: 'Generic Compatibility Tool',
      description: 'Tests explicit Registry generic compatibility.',
      risk: 'low',
      inputSchema,
      outputSchema,
      requiredPermissions: [],
    });
    const registry = createToolRegistry();

    const registeredTool = registry.register<typeof inputSchema>(tool);

    expectTypeOf(registeredTool.inputSchema).toEqualTypeOf<typeof inputSchema>();
  });

  it('preserves explicit input and output schema register generic compatibility', () => {
    const inputSchema = z.object({ value: z.string() });
    const outputSchema = z.object({ result: z.string() });
    const tool = defineTool({
      id: 'generic.schemas',
      name: 'Generic Schema Tool',
      description: 'Tests both explicit Registry schema generics.',
      risk: 'low',
      inputSchema,
      outputSchema,
      requiredPermissions: [],
    });
    const registry = createToolRegistry();

    const registeredTool = registry.register<typeof inputSchema, typeof outputSchema>(tool);

    expectTypeOf(registeredTool.inputSchema).toEqualTypeOf<typeof inputSchema>();
    expectTypeOf(registeredTool.outputSchema).toEqualTypeOf<typeof outputSchema>();
  });

  it('retrieves a registered Tool by its stable ID', () => {
    const registry = createToolRegistry();
    const tool = createTestTool('web.search');

    const registeredTool = registry.register(tool);

    expect(registry.get('web.search')).toBe(registeredTool);
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

    const registeredFirstTool = registry.register(firstTool);
    const registeredSecondTool = registry.register(secondTool);

    const listedTools = registry.list();

    expect(listedTools).toEqual([firstTool, secondTool]);
    expect(listedTools[0]).toBe(registeredFirstTool);
    expect(listedTools[1]).toBe(registeredSecondTool);
    expect(Object.isFrozen(listedTools)).toBe(true);
    expect(listedTools.every((tool) => Object.isFrozen(tool))).toBe(true);
    expect(registry.list()).not.toBe(listedTools);
  });

  it('isolates registered state from caller mutation', () => {
    const registry = createToolRegistry();
    const tool = createTestTool('web.search');
    const registeredTool = registry.register(tool);

    (tool as { risk: string }).risk = 'critical';

    expect(registry.get('web.search')).toBe(registeredTool);
    expect(registry.get('web.search')?.risk).toBe('low');
    expect(registry.list()).toEqual([registeredTool]);
  });

  it('owns one ordered frozen permission snapshot without freezing caller state', () => {
    const registry = createToolRegistry();
    const requiredPermissions = ['calendar.write', 'calendar.read'];
    const tool = defineTool({
      id: 'calendar.sync',
      name: 'Calendar Sync Tool',
      description: 'Exercises nested Registry ownership.',
      risk: 'high',
      inputSchema: z.unknown(),
      outputSchema: z.unknown(),
      requiredPermissions,
    });

    const registeredTool = registry.register(tool);
    const registeredPermissions = registeredTool.requiredPermissions;

    requiredPermissions.push('email.send');

    expect(registeredPermissions).toEqual(['calendar.write', 'calendar.read']);
    expect(registeredPermissions).not.toBe(requiredPermissions);
    expect(Object.isFrozen(registeredPermissions)).toBe(true);
    expect(Object.isFrozen(requiredPermissions)).toBe(false);
    expect(Object.isFrozen(tool)).toBe(false);
    expect(registry.get('calendar.sync')).toBe(registeredTool);
    expect(registry.get('calendar.sync')?.requiredPermissions).toBe(registeredPermissions);
    expect(registry.list()[0]).toBe(registeredTool);
    expect(registry.list()[0]?.requiredPermissions).toBe(registeredPermissions);
    expect(() => {
      (registeredPermissions as string[]).push('files.write');
    }).toThrow(TypeError);
  });

  it('captures exact schema references without freezing them or following caller replacement', () => {
    const registry = createToolRegistry();
    const tool = createTestTool('web.search');
    const capturedInputSchema = tool.inputSchema;
    const capturedOutputSchema = tool.outputSchema;
    const replacementInputSchema = z.object({ replacementInput: z.boolean() });
    const replacementOutputSchema = z.object({ replacementOutput: z.boolean() });

    const registeredTool = registry.register(tool);
    (tool as unknown as { inputSchema: typeof replacementInputSchema }).inputSchema =
      replacementInputSchema;
    (tool as unknown as { outputSchema: typeof replacementOutputSchema }).outputSchema =
      replacementOutputSchema;

    expect(registeredTool.inputSchema).toBe(capturedInputSchema);
    expect(registeredTool.outputSchema).toBe(capturedOutputSchema);
    expect(registry.get('web.search')?.inputSchema).toBe(capturedInputSchema);
    expect(registry.get('web.search')?.outputSchema).toBe(capturedOutputSchema);
    expect(tool.inputSchema).toBe(replacementInputSchema);
    expect(tool.outputSchema).toBe(replacementOutputSchema);
    expect(Object.isFrozen(capturedInputSchema)).toBe(false);
    expect(Object.isFrozen(capturedOutputSchema)).toBe(false);
    expect(Object.isFrozen(tool)).toBe(false);
  });

  it('does not allow mutation of the registered Tool snapshot', () => {
    const registry = createToolRegistry();
    const registeredTool = registry.register(createTestTool('web.search'));

    expect(() => {
      (registeredTool as { risk: string }).risk = 'critical';
    }).toThrow(TypeError);
    expect(registry.get('web.search')?.risk).toBe('low');
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

    const registeredTool = registry.register(firstTool);

    expect(() => registry.register(duplicateTool)).toThrow(DuplicateToolIdError);
    expect(() => registry.register(duplicateTool)).toThrow(
      'Tool with id "web.search" is already registered',
    );
    expect(registry.get('web.search')).toBe(registeredTool);
    expect(registry.list()).toEqual([registeredTool]);
  });

  it('validates malformed runtime data before checking Registry invariants', () => {
    const registry = createToolRegistry();
    const firstTool = createTestTool('web.search');
    const malformedDuplicate = { ...firstTool, name: '' } as ToolDefinition;

    const registeredTool = registry.register(firstTool);

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidToolDefinitionError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicateToolIdError);
    expect(registry.get('web.search')).toBe(registeredTool);
  });

  it('keeps separate Registry instances isolated without hidden global state', () => {
    const firstRegistry = createToolRegistry();
    const secondRegistry = createToolRegistry();

    firstRegistry.register(createTestTool('web.search'));

    expect(firstRegistry.has('web.search')).toBe(true);
    expect(secondRegistry.has('web.search')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });

  it('creates isolated registered references for the same Tool object', () => {
    const firstRegistry = createToolRegistry();
    const secondRegistry = createToolRegistry();
    const tool = createTestTool('web.search');

    const firstRegisteredTool = firstRegistry.register(tool);
    const secondRegisteredTool = secondRegistry.register(tool);

    expect(firstRegisteredTool).not.toBe(tool);
    expect(secondRegisteredTool).not.toBe(tool);
    expect(firstRegisteredTool).not.toBe(secondRegisteredTool);
    expect(firstRegisteredTool.inputSchema).toBe(tool.inputSchema);
    expect(secondRegisteredTool.inputSchema).toBe(tool.inputSchema);
    expect(firstRegisteredTool.inputSchema).toBe(secondRegisteredTool.inputSchema);
    expect(firstRegisteredTool.outputSchema).toBe(tool.outputSchema);
    expect(secondRegisteredTool.outputSchema).toBe(tool.outputSchema);
    expect(firstRegisteredTool.outputSchema).toBe(secondRegisteredTool.outputSchema);
    expect(firstRegisteredTool.requiredPermissions).not.toBe(tool.requiredPermissions);
    expect(secondRegisteredTool.requiredPermissions).not.toBe(tool.requiredPermissions);
    expect(firstRegisteredTool.requiredPermissions).not.toBe(
      secondRegisteredTool.requiredPermissions,
    );
    expect(firstRegisteredTool.requiredPermissions).toEqual(['web.read']);
    expect(secondRegisteredTool.requiredPermissions).toEqual(['web.read']);
    expect(Object.isFrozen(firstRegisteredTool.requiredPermissions)).toBe(true);
    expect(Object.isFrozen(secondRegisteredTool.requiredPermissions)).toBe(true);
    expect(firstRegisteredTool).toEqual(tool);
    expect(secondRegisteredTool).toEqual(tool);
    expect(firstRegistry.get('web.search')).toBe(firstRegisteredTool);
    expect(secondRegistry.get('web.search')).toBe(secondRegisteredTool);
  });
});
