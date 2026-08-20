import { z } from 'zod';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { defineTool, parseToolInput, ToolInputValidationError, type ToolRisk } from '../index.js';

function createTool(risk: ToolRisk = 'low') {
  return defineTool({
    id: 'web.search',
    name: 'Web Search',
    description: 'Searches public web information.',
    risk,
    inputSchema: z.object({
      query: z.string().trim().min(1),
      limit: z.coerce.number().int().positive().default(10),
    }),
    outputSchema: z.unknown(),
    requiredPermissions: ['web.read'],
  });
}

describe('parseToolInput', () => {
  it('accepts unknown input and returns the schema-parsed output', () => {
    const tool = createTool();
    const input: unknown = { query: '  zod  ', limit: '5', privateExtra: 'not returned' };

    const parsed = parseToolInput(tool, input);

    expect(parsed).toEqual({ query: 'zod', limit: 5 });
    expectTypeOf(parsed).toEqualTypeOf<{ query: string; limit: number }>();
  });

  it('parses schema input without evaluating non-empty required permissions', () => {
    const tool = createTool();

    expect(tool.requiredPermissions).toEqual(['web.read']);
    expect(parseToolInput(tool, { query: 'permission-independent' })).toEqual({
      query: 'permission-independent',
      limit: 10,
    });
  });

  it('returns schema defaults and transformed output', () => {
    const tool = defineTool({
      id: 'numbers.double',
      name: 'Double Number',
      description: 'Parses and doubles a number.',
      risk: 'critical',
      inputSchema: z
        .object({ value: z.coerce.number(), label: z.string().default('result') })
        .transform(({ value, label }) => ({ doubled: value * 2, label })),
      outputSchema: z.unknown(),
      requiredPermissions: [],
    });

    const parsed = parseToolInput(tool, { value: '4' });

    expect(parsed).toEqual({ doubled: 8, label: 'result' });
    expectTypeOf(parsed).toEqualTypeOf<{ doubled: number; label: string }>();
  });

  it('wraps invalid input in a stable ODYS error without exposing the raw payload', () => {
    const tool = createTool();
    const privatePayload = 'private-query-value';

    let thrown: unknown;
    try {
      parseToolInput(tool, { query: privatePayload, limit: 'not-a-number' });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolInputValidationError);
    expect(thrown).toMatchObject({
      name: 'ToolInputValidationError',
      message: 'Invalid input for Tool "web.search".',
      toolId: 'web.search',
    });
    expect((thrown as Error).message).not.toContain(privatePayload);
    expect((thrown as Error).cause).toBeInstanceOf(z.ZodError);
  });

  it('does not mutate the Tool definition when validation fails', () => {
    const tool = createTool();
    const definitionBeforeValidation = { ...tool };

    expect(() => parseToolInput(tool, { query: '', limit: 1 })).toThrow(ToolInputValidationError);
    expect(tool).toEqual(definitionBeforeValidation);
    expect(tool.inputSchema).toBe(definitionBeforeValidation.inputSchema);
  });

  it('preserves an arbitrary exception thrown by input schema logic', () => {
    const schemaError = new Error('input schema implementation failed');
    const tool = defineTool({
      id: 'input.throw',
      name: 'Throwing Input Schema',
      description: 'Exercises the input exception boundary.',
      risk: 'low',
      inputSchema: z.unknown().transform(() => {
        throw schemaError;
      }),
      outputSchema: z.unknown(),
      requiredPermissions: [],
    });

    expect(() => parseToolInput(tool, 'raw input')).toThrow(schemaError);

    try {
      parseToolInput(tool, 'raw input');
    } catch (error) {
      expect(error).toBe(schemaError);
      expect(error).not.toBeInstanceOf(ToolInputValidationError);
    }
  });

  it.each<ToolRisk>(['low', 'medium', 'high', 'critical'])(
    'validates independently from the Tool risk %s',
    (risk) => {
      const tool = createTool(risk);

      expect(parseToolInput(tool, { query: 'valid' })).toEqual({ query: 'valid', limit: 10 });
      expect(() => parseToolInput(tool, { query: '' })).toThrow(ToolInputValidationError);
    },
  );
});
