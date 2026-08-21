import { z } from 'zod';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  assertToolPermissionRequirements,
  createToolRegistry,
  defineTool,
  evaluateToolPermissionRequirements,
  ToolPermissionDeniedError,
  type ToolDefinition,
  type ToolPermissionRequirementResult,
  type ToolRisk,
} from '../index.js';

interface TestToolOptions {
  readonly risk?: ToolRisk;
  readonly requiredPermissions?: readonly string[];
  readonly inputSchema?: z.ZodType;
  readonly outputSchema?: z.ZodType;
}

function createTestTool({
  risk = 'low',
  requiredPermissions = ['calendar.read', 'calendar.write'],
  inputSchema = z.unknown(),
  outputSchema = z.unknown(),
}: TestToolOptions = {}): ToolDefinition {
  return defineTool({
    id: 'calendar.sync',
    name: 'Calendar Sync',
    description: 'Synchronizes calendar data.',
    risk,
    inputSchema,
    outputSchema,
    requiredPermissions,
  });
}

describe('evaluateToolPermissionRequirements', () => {
  it('reports satisfaction when all exact required permissions are resolved', () => {
    const result = evaluateToolPermissionRequirements(createTestTool(), [
      'calendar.read',
      'calendar.write',
    ]);

    expect(result).toEqual({ satisfied: true, missingPermissions: [] });
    expectTypeOf(result).toEqualTypeOf<ToolPermissionRequirementResult>();
  });

  it('reports one missing required permission without throwing', () => {
    expect(evaluateToolPermissionRequirements(createTestTool(), ['calendar.read'])).toEqual({
      satisfied: false,
      missingPermissions: ['calendar.write'],
    });
  });

  it('returns every missing permission in declaration order without sorting', () => {
    const tool = createTestTool({
      requiredPermissions: ['calendar.write', 'calendar.read', 'email.send'],
    });

    expect(evaluateToolPermissionRequirements(tool, [])).toEqual({
      satisfied: false,
      missingPermissions: ['calendar.write', 'calendar.read', 'email.send'],
    });
  });

  it('satisfies an empty declaration with no resolved permissions', () => {
    expect(
      evaluateToolPermissionRequirements(createTestTool({ requiredPermissions: [] }), []),
    ).toEqual({ satisfied: true, missingPermissions: [] });
  });

  it('ignores resolved permissions that the Tool does not require', () => {
    const result = evaluateToolPermissionRequirements(createTestTool(), [
      'files.read',
      'calendar.write',
      'email.send',
      'calendar.read',
    ]);

    expect(result).toEqual({ satisfied: true, missingPermissions: [] });
  });

  it.each([
    {
      label: 'a different exact identifier',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: ['calendar.write'],
    },
    {
      label: 'a wildcard-like identifier',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: ['calendar.*'],
    },
    {
      label: 'a parent identifier',
      requiredPermissions: ['calendar.read.events'],
      resolvedPermissions: ['calendar.read'],
    },
    {
      label: 'a child identifier',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: ['calendar.read.events'],
    },
    {
      label: 'a differently cased identifier',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: ['Calendar.read'],
    },
    {
      label: 'a whitespace-padded identifier',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: [' calendar.read '],
    },
  ])(
    'does not satisfy a requirement with $label',
    ({ requiredPermissions, resolvedPermissions }) => {
      const result = evaluateToolPermissionRequirements(
        createTestTool({ requiredPermissions }),
        resolvedPermissions,
      );

      expect(result).toEqual({ satisfied: false, missingPermissions: requiredPermissions });
    },
  );

  it('does not give duplicate resolved identifiers additional authority', () => {
    const tool = createTestTool();
    const uniqueResult = evaluateToolPermissionRequirements(tool, ['calendar.read']);
    const duplicateResult = evaluateToolPermissionRequirements(tool, [
      'calendar.read',
      'calendar.read',
    ]);

    expect(duplicateResult).toEqual(uniqueResult);
    expect(duplicateResult).toEqual({
      satisfied: false,
      missingPermissions: ['calendar.write'],
    });
  });

  it.each<ToolRisk>(['low', 'medium', 'high', 'critical'])(
    'evaluates independently from the Tool risk %s',
    (risk) => {
      const result = evaluateToolPermissionRequirements(createTestTool({ risk }), [
        'calendar.read',
        'calendar.write',
      ]);

      expect(result).toEqual({ satisfied: true, missingPermissions: [] });
    },
  );

  it('does not parse schemas or invoke an execution-like member', () => {
    const inputSchemaCheck = vi.fn(() => true);
    const outputSchemaCheck = vi.fn(() => true);
    const execute = vi.fn();
    const tool = Object.assign(
      createTestTool({
        inputSchema: z.custom(inputSchemaCheck),
        outputSchema: z.custom(outputSchemaCheck),
      }),
      { execute },
    );

    expect(evaluateToolPermissionRequirements(tool, ['calendar.read'])).toEqual({
      satisfied: false,
      missingPermissions: ['calendar.write'],
    });
    expect(inputSchemaCheck).not.toHaveBeenCalled();
    expect(outputSchemaCheck).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not mutate or freeze caller-owned permission collections or the Tool definition', () => {
    const requiredPermissions = ['calendar.write', 'calendar.read'];
    const resolvedPermissions = ['calendar.read', 'files.read', 'calendar.read'];
    const tool = createTestTool({ requiredPermissions });
    const requiredBefore = [...requiredPermissions];
    const resolvedBefore = [...resolvedPermissions];
    const definitionBefore = { ...tool };

    evaluateToolPermissionRequirements(tool, resolvedPermissions);

    expect(requiredPermissions).toEqual(requiredBefore);
    expect(resolvedPermissions).toEqual(resolvedBefore);
    expect(tool).toEqual(definitionBefore);
    expect(tool.requiredPermissions).toBe(requiredPermissions);
    expect(Object.isFrozen(requiredPermissions)).toBe(false);
    expect(Object.isFrozen(resolvedPermissions)).toBe(false);
    expect(Object.isFrozen(tool)).toBe(false);
  });

  it('returns a frozen Core-owned result and missing-permission snapshot', () => {
    const requiredPermissions = ['calendar.write', 'calendar.read'];
    const tool = createTestTool({ requiredPermissions });

    const result = evaluateToolPermissionRequirements(tool, ['calendar.read']);
    requiredPermissions.push('email.send');

    expect(result).toEqual({ satisfied: false, missingPermissions: ['calendar.write'] });
    expect(result.missingPermissions).not.toBe(requiredPermissions);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.missingPermissions)).toBe(true);
    expect(() => {
      (result as { satisfied: boolean }).satisfied = true;
    }).toThrow(TypeError);
    expect(() => {
      (result.missingPermissions as string[]).push('files.write');
    }).toThrow(TypeError);
  });
});

describe('assertToolPermissionRequirements', () => {
  it('returns normally when every required permission is resolved', () => {
    expect(
      assertToolPermissionRequirements(createTestTool(), ['calendar.read', 'calendar.write']),
    ).toBeUndefined();
  });

  it('allows an empty requirement declaration with no resolved permissions', () => {
    expect(() =>
      assertToolPermissionRequirements(createTestTool({ requiredPermissions: [] }), []),
    ).not.toThrow();
  });

  it('ignores extra resolved permissions', () => {
    expect(() =>
      assertToolPermissionRequirements(createTestTool(), [
        'files.read',
        'calendar.write',
        'calendar.read',
      ]),
    ).not.toThrow();
  });

  it('does not give duplicate resolved identifiers additional semantics', () => {
    const tool = createTestTool();

    for (const resolvedPermissions of [['calendar.read'], ['calendar.read', 'calendar.read']]) {
      expect(() => assertToolPermissionRequirements(tool, resolvedPermissions)).toThrow(
        ToolPermissionDeniedError,
      );

      try {
        assertToolPermissionRequirements(tool, resolvedPermissions);
      } catch (error) {
        expect(error).toMatchObject({ missingPermissions: ['calendar.write'] });
      }
    }
  });

  it('throws a structured permission-denied error for one missing requirement', () => {
    let thrown: unknown;

    try {
      assertToolPermissionRequirements(createTestTool(), ['calendar.read']);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolPermissionDeniedError);
    expect(thrown).toMatchObject({
      name: 'ToolPermissionDeniedError',
      message: 'Tool "calendar.sync" is missing required permissions.',
      toolId: 'calendar.sync',
      missingPermissions: ['calendar.write'],
    });
  });

  it('reports multiple missing requirements in evaluator declaration order', () => {
    const tool = createTestTool({
      requiredPermissions: ['calendar.write', 'calendar.read', 'email.send'],
    });

    let thrown: unknown;
    try {
      assertToolPermissionRequirements(tool, []);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolPermissionDeniedError);
    expect(thrown).toMatchObject({
      toolId: 'calendar.sync',
      missingPermissions: ['calendar.write', 'calendar.read', 'email.send'],
    });
    expect(Object.isFrozen((thrown as ToolPermissionDeniedError).missingPermissions)).toBe(true);
    expect(() => {
      ((thrown as ToolPermissionDeniedError).missingPermissions as string[]).push('files.write');
    }).toThrow(TypeError);
  });

  it.each([
    {
      label: 'case-insensitive matching',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: ['Calendar.read'],
    },
    {
      label: 'wildcard matching',
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: ['calendar.*'],
    },
    {
      label: 'implicit hierarchy matching',
      requiredPermissions: ['calendar.read.events'],
      resolvedPermissions: ['calendar.read'],
    },
  ])('does not introduce $label', ({ requiredPermissions, resolvedPermissions }) => {
    expect(() =>
      assertToolPermissionRequirements(
        createTestTool({ requiredPermissions }),
        resolvedPermissions,
      ),
    ).toThrow(ToolPermissionDeniedError);
  });

  it('does not parse schemas, execute the Tool, or inspect risk', () => {
    const inputSchemaCheck = vi.fn(() => true);
    const outputSchemaCheck = vi.fn(() => true);
    const readRisk = vi.fn(() => 'critical' as const);
    const execute = vi.fn();
    const tool = Object.assign(
      defineTool({
        id: 'calendar.sync',
        name: 'Calendar Sync',
        description: 'Synchronizes calendar data.',
        get risk() {
          return readRisk();
        },
        inputSchema: z.custom(inputSchemaCheck),
        outputSchema: z.custom(outputSchemaCheck),
        requiredPermissions: ['calendar.read'],
      }),
      { execute },
    );
    readRisk.mockClear();

    expect(() => assertToolPermissionRequirements(tool, ['calendar.read'])).not.toThrow();
    expect(inputSchemaCheck).not.toHaveBeenCalled();
    expect(outputSchemaCheck).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(readRisk).not.toHaveBeenCalled();
  });

  it('does not mutate or freeze caller state and owns the thrown missing snapshot', () => {
    const requiredPermissions = ['calendar.write', 'calendar.read'];
    const resolvedPermissions = ['calendar.read'];
    const tool = createTestTool({ requiredPermissions });
    const requiredBefore = [...requiredPermissions];
    const resolvedBefore = [...resolvedPermissions];
    const definitionBefore = { ...tool };

    let thrown: unknown;
    try {
      assertToolPermissionRequirements(tool, resolvedPermissions);
    } catch (error) {
      thrown = error;
    }

    expect(requiredPermissions).toEqual(requiredBefore);
    expect(resolvedPermissions).toEqual(resolvedBefore);
    expect(tool).toEqual(definitionBefore);
    expect(Object.isFrozen(requiredPermissions)).toBe(false);
    expect(Object.isFrozen(resolvedPermissions)).toBe(false);
    expect(Object.isFrozen(tool)).toBe(false);

    requiredPermissions.splice(0, requiredPermissions.length, 'files.write');
    resolvedPermissions.push('calendar.write');

    expect(thrown).toBeInstanceOf(ToolPermissionDeniedError);
    expect((thrown as ToolPermissionDeniedError).missingPermissions).toEqual(['calendar.write']);
  });

  it('copies a mutable missing-permission collection passed to the public error', () => {
    const missingPermissions = ['calendar.write'];
    const error = new ToolPermissionDeniedError('calendar.sync', missingPermissions);

    missingPermissions.push('email.send');

    expect(error.missingPermissions).toEqual(['calendar.write']);
    expect(error.missingPermissions).not.toBe(missingPermissions);
    expect(Object.isFrozen(error.missingPermissions)).toBe(true);
  });

  it('composes with the Registry-owned canonical Tool snapshot', () => {
    const registry = createToolRegistry();
    const registeredTool = registry.register(createTestTool());

    expect(Object.isFrozen(registeredTool)).toBe(true);
    expect(Object.isFrozen(registeredTool.requiredPermissions)).toBe(true);
    expect(() =>
      assertToolPermissionRequirements(registeredTool, ['calendar.read', 'calendar.write']),
    ).not.toThrow();
    expect(() => assertToolPermissionRequirements(registeredTool, ['calendar.read'])).toThrow(
      ToolPermissionDeniedError,
    );
  });
});
