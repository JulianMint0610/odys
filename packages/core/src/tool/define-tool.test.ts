import { z } from 'zod';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  defineTool,
  InvalidToolDefinitionError,
  type ToolDefinition,
  type ToolRisk,
} from '../index.js';

const inputSchema = z.object({ query: z.string() });
const outputSchema = z.object({ results: z.array(z.string()) });

const validDefinition: ToolDefinition = {
  id: 'web.search',
  name: 'Web Search',
  description: 'Searches public web information.',
  risk: 'low',
  inputSchema,
  outputSchema,
  requiredPermissions: [],
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
      outputSchema,
      requiredPermissions: [],
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

  it('preserves concrete input and output schema types independently', () => {
    const definition = defineTool({
      ...validDefinition,
      inputSchema: z.string().trim(),
      outputSchema: z.coerce.number(),
    });

    expectTypeOf(definition.inputSchema).toEqualTypeOf<z.ZodString>();
    expectTypeOf(definition.outputSchema).toEqualTypeOf<z.ZodCoercedNumber<unknown>>();
  });

  it('preserves explicit input and output schema generic compatibility', () => {
    const definition = defineTool<typeof inputSchema, typeof outputSchema>({
      ...validDefinition,
      inputSchema,
      outputSchema,
    });

    expectTypeOf(definition.inputSchema).toEqualTypeOf<typeof inputSchema>();
    expectTypeOf(definition.outputSchema).toEqualTypeOf<typeof outputSchema>();
  });

  it('keeps the first ToolDefinition generic assigned to the input schema', () => {
    const definition: ToolDefinition<typeof inputSchema> = { ...validDefinition, inputSchema };

    expectTypeOf(definition.inputSchema).toEqualTypeOf<typeof inputSchema>();
  });
  it('preserves explicit input-schema-only defineTool generic compatibility', () => {
    const definition = defineTool<typeof inputSchema>({
      ...validDefinition,
      inputSchema,
      outputSchema,
    });

    expectTypeOf(definition.inputSchema).toEqualTypeOf<typeof inputSchema>();
  });

  it.each([
    { label: 'an empty list', requiredPermissions: [] },
    { label: 'one identifier', requiredPermissions: ['web.read'] },
    {
      label: 'multiple identifiers',
      requiredPermissions: ['calendar.read', 'calendar.write'],
    },
    { label: 'a multi-segment identifier', requiredPermissions: ['model.context.read'] },
  ])('accepts $label', ({ requiredPermissions }) => {
    expect(() => defineTool({ ...validDefinition, requiredPermissions })).not.toThrow();
  });

  it('preserves required permission declaration order', () => {
    const requiredPermissions = ['calendar.write', 'calendar.read', 'email.send'];

    const definition = defineTool({ ...validDefinition, requiredPermissions });

    expect(definition.requiredPermissions).toEqual([
      'calendar.write',
      'calendar.read',
      'email.send',
    ]);
  });

  it('rejects a missing requiredPermissions declaration', () => {
    const definition = { ...validDefinition } as Record<string, unknown>;
    delete definition.requiredPermissions;

    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      'Invalid Tool definition: requiredPermissions must be an array',
    );
  });

  it.each([undefined, null, 'web.read', 1, {}])(
    'rejects the non-array requiredPermissions value %j',
    (requiredPermissions) => {
      expect(() => defineTool(runtimeDefinition({ requiredPermissions }))).toThrow(
        InvalidToolDefinitionError,
      );
    },
  );

  it.each([
    ['', 'an empty identifier'],
    [' ', 'a whitespace-only identifier'],
    ['web', 'an identifier without a dot-qualified action'],
    ['Web.read', 'an uppercase namespace'],
    ['web.Read', 'an uppercase action'],
    ['.web.read', 'a leading dot'],
    ['web.', 'a trailing dot'],
    ['web..read', 'a repeated dot'],
    ['web read', 'a space'],
    ['web_read', 'an underscore'],
    ['web-read', 'a hyphen'],
  ])('rejects required permission %j containing %s', (permissionId) => {
    expect(() => defineTool(runtimeDefinition({ requiredPermissions: [permissionId] }))).toThrow(
      InvalidToolDefinitionError,
    );
  });

  it.each([null, undefined, 1, {}, []])(
    'rejects the non-string required permission member %j',
    (permissionId) => {
      expect(() =>
        defineTool(runtimeDefinition({ requiredPermissions: ['web.read', permissionId] })),
      ).toThrow(InvalidToolDefinitionError);
    },
  );

  it('rejects exact duplicate required permissions without normalizing the declaration', () => {
    expect(() =>
      defineTool(runtimeDefinition({ requiredPermissions: ['calendar.read', 'calendar.read'] })),
    ).toThrow(InvalidToolDefinitionError);
    expect(() =>
      defineTool(runtimeDefinition({ requiredPermissions: ['calendar.read', 'calendar.read'] })),
    ).toThrow('Invalid Tool definition: requiredPermissions must not contain duplicates');
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

  it('rejects a missing outputSchema', () => {
    const definition = { ...validDefinition } as Record<string, unknown>;
    delete definition.outputSchema;

    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      InvalidToolDefinitionError,
    );
    expect(() => defineTool(definition as unknown as ToolDefinition)).toThrow(
      'Invalid Tool definition: outputSchema must be a Zod schema',
    );
  });

  it.each([null, undefined, 'schema', {}, { safeParse: () => ({ success: true }) }])(
    'rejects the non-Zod outputSchema %j',
    (invalidSchema) => {
      expect(() => defineTool(runtimeDefinition({ outputSchema: invalidSchema }))).toThrow(
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

  it('does not mutate or freeze the caller-owned definition, permission list, or schemas', () => {
    const requiredPermissions = ['calendar.write', 'calendar.read'];
    const declaredPermissions = [...requiredPermissions];
    const callerDefinition = { ...validDefinition, requiredPermissions };

    const definition = defineTool(callerDefinition);

    expect(definition).toBe(callerDefinition);
    expect(definition.requiredPermissions).toBe(requiredPermissions);
    expect(requiredPermissions).toEqual(declaredPermissions);
    expect(Object.isFrozen(callerDefinition)).toBe(false);
    expect(Object.isFrozen(requiredPermissions)).toBe(false);
    expect(Object.isFrozen(inputSchema)).toBe(false);
    expect(Object.isFrozen(outputSchema)).toBe(false);
  });

  it('reports which field failed validation', () => {
    expect(() => defineTool({ ...validDefinition, id: 'Web.search' })).toThrow(
      'Invalid Tool definition: id',
    );
  });
});
