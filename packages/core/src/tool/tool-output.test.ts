import { z } from 'zod';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { defineTool, parseToolOutput, ToolOutputValidationError, type ToolRisk } from '../index.js';

function createTool(risk: ToolRisk = 'low') {
  return defineTool({
    id: 'web.search',
    name: 'Web Search',
    description: 'Searches public web information.',
    risk,
    inputSchema: z.unknown(),
    outputSchema: z.object({
      query: z.string().trim(),
      count: z.coerce.number().int().nonnegative().default(0),
    }),
    requiredPermissions: ['web.read'],
  });
}

describe('parseToolOutput', () => {
  it('accepts unknown output and returns the schema-parsed output', () => {
    const tool = createTool();
    const output: unknown = { query: '  zod  ', count: '5', privateExtra: 'not returned' };

    const parsed = parseToolOutput(tool, output);

    expect(parsed).toEqual({ query: 'zod', count: 5 });
    expect(parsed).not.toBe(output);
    expectTypeOf(parsed).toEqualTypeOf<{ query: string; count: number }>();
  });

  it('parses schema output without evaluating non-empty required permissions', () => {
    const tool = createTool();

    expect(tool.requiredPermissions).toEqual(['web.read']);
    expect(parseToolOutput(tool, { query: 'permission-independent' })).toEqual({
      query: 'permission-independent',
      count: 0,
    });
  });

  it('returns schema defaults and transformed output', () => {
    const tool = defineTool({
      id: 'numbers.summary',
      name: 'Number Summary',
      description: 'Parses and summarizes a number.',
      risk: 'critical',
      inputSchema: z.unknown(),
      outputSchema: z
        .object({ value: z.coerce.number(), label: z.string().default('result') })
        .transform(({ value, label }) => ({ doubled: value * 2, label })),
      requiredPermissions: [],
    });

    const parsed = parseToolOutput(tool, { value: '4' });

    expect(parsed).toEqual({ doubled: 8, label: 'result' });
    expectTypeOf(parsed).toEqualTypeOf<{ doubled: number; label: string }>();
  });

  it('wraps invalid output in a stable ODYS error without exposing the raw payload', () => {
    const tool = createTool();
    const privatePayload = 'private-provider-payload';

    let thrown: unknown;
    try {
      parseToolOutput(tool, { query: privatePayload, count: 'not-a-number' });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolOutputValidationError);
    expect(thrown).toMatchObject({
      name: 'ToolOutputValidationError',
      message: 'Invalid output for Tool "web.search".',
      toolId: 'web.search',
    });
    expect((thrown as Error).message).not.toContain(privatePayload);
    expect((thrown as Error).cause).toBeInstanceOf(z.ZodError);
  });

  it('preserves an arbitrary exception thrown by output schema logic', () => {
    const schemaError = new Error('output schema implementation failed');
    const tool = defineTool({
      id: 'output.throw',
      name: 'Throwing Output Schema',
      description: 'Exercises the output exception boundary.',
      risk: 'low',
      inputSchema: z.unknown(),
      outputSchema: z.unknown().transform(() => {
        throw schemaError;
      }),
      requiredPermissions: [],
    });

    expect(() => parseToolOutput(tool, 'raw output')).toThrow(schemaError);

    try {
      parseToolOutput(tool, 'raw output');
    } catch (error) {
      expect(error).toBe(schemaError);
      expect(error).not.toBeInstanceOf(ToolOutputValidationError);
    }
  });

  it('does not mutate the Tool definition when validation fails', () => {
    const tool = createTool();
    const definitionBeforeValidation = { ...tool };

    expect(() => parseToolOutput(tool, { query: 'zod', count: -1 })).toThrow(
      ToolOutputValidationError,
    );
    expect(tool).toEqual(definitionBeforeValidation);
    expect(tool.outputSchema).toBe(definitionBeforeValidation.outputSchema);
  });

  it.each<ToolRisk>(['low', 'medium', 'high', 'critical'])(
    'validates independently from the Tool risk %s',
    (risk) => {
      const tool = createTool(risk);

      expect(parseToolOutput(tool, { query: 'valid' })).toEqual({ query: 'valid', count: 0 });
      expect(() => parseToolOutput(tool, { query: 'valid', count: -1 })).toThrow(
        ToolOutputValidationError,
      );
    },
  );
});
