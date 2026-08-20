import { z } from 'zod';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  defineTool,
  evaluateToolPermissionRequirements,
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
