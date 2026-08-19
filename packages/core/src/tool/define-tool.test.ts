import { z } from 'zod';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  defineTool,
  InvalidToolDefinitionError,
  type ToolDefinition,
  type ToolRisk,
} from '../index.js';

const inputSchema = z.object({ query: z.string() });

const validDefinition: ToolDefinition = {
  id: 'web.search',
  name: 'Web Search',
  description: 'Searches public web information.',
  risk: 'low',
  inputSchema,
};

function runtimeDefinition(overrides: Record<string, unknown>): ToolDefinition {
  return { ...validDefinition, ...overrides } as ToolDefinition;
}

describe('defineTool', () => {
  it('defines a valid Tool and preserves every public metadata field', () => {
    const definition = defineTool(validDefinition);

    expect(definition).toBe(validDefinition);
    expect(definition).toEqual({
      id: 'web.search',
      name: 'Web Search',
      description: 'Searches public web information.',
      risk: 'low',
      inputSchema,
    });
  });

  it('preserves concrete schema type information', () => {
    const definition = defineTool({
      ...validDefinition,
      inputSchema: z.object({ query: z.string(), limit: z.number().int().optional() }),
    });

    expectTypeOf(definition.inputSchema).toEqualTypeOf<
      z.ZodObject<{ query: z.ZodString; limit: z.ZodOptional<z.ZodNumber> }>
    >();
  });

  it.each([
    'web.search',
    'calendar.read_events',
    'calendar.create_event',
    'calendar.create-event',
    'email.read',
    'email.send',
    'files.read',
    'files.write',
    'code.execute',
  ])('allows the canonical Tool id %s', (id) => {
    expect(() => defineTool({ ...validDefinition, id })).not.toThrow();
  });

  it.each<ToolRisk>(['low', 'medium', 'high', 'critical'])(
    'allows the supported Tool risk %s',
    (risk) => {
      expect(() => defineTool({ ...validDefinition, risk })).not.toThrow();
    },
  );

  it.each([
    ['', 'an empty id'],
    ['   ', 'only whitespace'],
    ['Web.search', 'an uppercase letter'],
    ['.web', 'a leading separator'],
    ['web.', 'a trailing separator'],
    ['web..search', 'a repeated separator'],
    ['web search', 'a space'],
    ['web/search', 'a slash'],
    ['-web', 'a leading hyphen'],
  ])('rejects Tool id %j containing %s', (id) => {
    expect(() => defineTool({ ...validDefinition, id })).toThrow(InvalidToolDefinitionError);
  });

  it.each([
    { label: 'a missing id', overrides: {}, missingField: 'id' },
    { label: 'a null id', overrides: { id: null } },
    { label: 'a numeric id', overrides: { id: 1 } },
    { label: 'an object id', overrides: { id: {} } },
  ])('rejects $label', ({ overrides, missingField }) => {
    const definition = { ...validDefinition, ...overrides } as Record<string, unknown>;

    if (missingField !== undefined) {
      delete definition[missingField];
    }

    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      InvalidToolDefinitionError,
    );
  });

  it.each(['name', 'description'] as const)('rejects a missing or invalid %s', (field) => {
    const missingDefinition = { ...validDefinition } as Record<string, unknown>;
    delete missingDefinition[field];

    expect(() => defineTool(missingDefinition as unknown as ToolDefinition)).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(runtimeDefinition({ [field]: '' }))).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(runtimeDefinition({ [field]: '   ' }))).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(runtimeDefinition({ [field]: null }))).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(runtimeDefinition({ [field]: 1 }))).toThrow(InvalidToolDefinitionError);
  });

  it.each([
    { label: 'a missing risk', risk: undefined, missing: true },
    { label: 'a null risk', risk: null },
    { label: 'a numeric risk', risk: 1 },
    { label: 'an object risk', risk: {} },
    { label: 'an unsupported risk', risk: 'unknown' },
    { label: 'an uppercase risk', risk: 'HIGH' },
    { label: 'a whitespace-padded risk', risk: ' high ' },
  ])('rejects $label', ({ risk, missing }) => {
    const definition = runtimeDefinition({ risk });

    if (missing === true) {
      delete (definition as unknown as Record<string, unknown>).risk;
    }

    expect(() => defineTool(definition)).toThrow(InvalidToolDefinitionError);
  });

  it('rejects a missing inputSchema', () => {
    const definition = { ...validDefinition } as Record<string, unknown>;
    delete definition.inputSchema;

    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      'Invalid Tool definition: inputSchema must be a Zod schema',
    );
  });

  it.each([null, undefined, 'schema', {}, { safeParse: () => ({ success: true }) }])(
    'rejects the non-Zod inputSchema %j',
    (invalidSchema) => {
      expect(() => defineTool(runtimeDefinition({ inputSchema: invalidSchema }))).toThrow(
        InvalidToolDefinitionError,
      );
    },
  );

  it.each([null, 1, [], {}])(
    'rejects a malformed runtime definition without leaking an incidental TypeError',
    (definition) => {
      expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
        InvalidToolDefinitionError,
      );
    },
  );

  it('does not normalize accepted metadata', () => {
    const definition = defineTool({
      ...validDefinition,
      name: ' Web Search ',
      description: ' Searches public web information. ',
    });

    expect(definition.name).toBe(' Web Search ');
    expect(definition.description).toBe(' Searches public web information. ');
  });

  it('does not mutate or freeze the caller-owned definition or its schema', () => {
    const callerDefinition = { ...validDefinition };

    const definition = defineTool(callerDefinition);

    expect(definition).toBe(callerDefinition);
    expect(Object.isFrozen(callerDefinition)).toBe(false);
    expect(Object.isFrozen(inputSchema)).toBe(false);
  });

  it('reports which field failed validation', () => {
    expect(() => defineTool({ ...validDefinition, id: 'Web.search' })).toThrow(
      'Invalid Tool definition: id',
    );
  });
});
