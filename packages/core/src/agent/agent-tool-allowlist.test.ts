import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  AgentToolNotAllowedError,
  assertAgentToolAllowed,
  defineAgent,
  evaluateAgentToolAllowance,
  type AgentDefinition,
  type AgentToolAllowanceEvaluation,
} from '../index.js';

function createTestAgent(allowedTools: readonly string[] = ['files.read']): AgentDefinition {
  return defineAgent({
    id: 'research-agent',
    name: 'Research Agent',
    version: '1.0.0',
    description: 'Researches requested topics.',
    responsibility: 'Collect relevant information.',
    allowedTools,
  });
}

describe('evaluateAgentToolAllowance', () => {
  it('allows an exact declared Tool ID', () => {
    const result = evaluateAgentToolAllowance(createTestAgent(), 'files.read');

    expect(result).toEqual({ isAllowed: true });
    expectTypeOf(result).toEqualTypeOf<AgentToolAllowanceEvaluation>();
  });

  it('denies an undeclared Tool ID', () => {
    expect(evaluateAgentToolAllowance(createTestAgent(), 'files.write')).toEqual({
      isAllowed: false,
    });
  });

  it('denies every candidate when the allowlist is empty', () => {
    expect(evaluateAgentToolAllowance(createTestAgent([]), 'files.read')).toEqual({
      isAllowed: false,
    });
  });

  it.each([
    { candidate: 'Files.read', label: 'case-insensitive matching' },
    { candidate: 'files', label: 'prefix matching' },
    { candidate: 'files.*', label: 'wildcard matching' },
    { candidate: 'files.read.meta', label: 'child hierarchy implication' },
  ])('does not introduce $label', ({ candidate }) => {
    expect(evaluateAgentToolAllowance(createTestAgent(), candidate)).toEqual({
      isAllowed: false,
    });
  });

  it('does not let a declared child identifier imply its parent', () => {
    expect(evaluateAgentToolAllowance(createTestAgent(['files.read.meta']), 'files.read')).toEqual({
      isAllowed: false,
    });
  });

  it('allows an unknown-but-declared canonical Tool ID without registry lookup', () => {
    expect(evaluateAgentToolAllowance(createTestAgent(['future.search']), 'future.search')).toEqual(
      {
        isAllowed: true,
      },
    );
  });

  it('treats a non-canonical candidate only as an exact membership candidate', () => {
    expect(evaluateAgentToolAllowance(createTestAgent(), ' files.read ')).toEqual({
      isAllowed: false,
    });
  });

  it('does not invoke registry-, runtime-, permission-, policy-, or approval-like members', () => {
    const toolRegistry = vi.fn();
    const agentRegistry = vi.fn();
    const toolRuntime = vi.fn();
    const resolvePermissions = vi.fn();
    const evaluatePolicy = vi.fn();
    const requestApproval = vi.fn();
    const definition = Object.assign(createTestAgent(), {
      toolRegistry,
      agentRegistry,
      toolRuntime,
      resolvePermissions,
      evaluatePolicy,
      requestApproval,
    });

    expect(evaluateAgentToolAllowance(definition, 'files.read')).toEqual({ isAllowed: true });
    expect(toolRegistry).not.toHaveBeenCalled();
    expect(agentRegistry).not.toHaveBeenCalled();
    expect(toolRuntime).not.toHaveBeenCalled();
    expect(resolvePermissions).not.toHaveBeenCalled();
    expect(evaluatePolicy).not.toHaveBeenCalled();
    expect(requestApproval).not.toHaveBeenCalled();
  });

  it('does not mutate or freeze the Agent definition or caller-owned allowlist', () => {
    const allowedTools = ['files.read', 'future.search'];
    const definition = createTestAgent(allowedTools);
    const allowedToolsBefore = [...allowedTools];
    const definitionBefore = { ...definition };

    evaluateAgentToolAllowance(definition, 'files.read');

    expect(allowedTools).toEqual(allowedToolsBefore);
    expect(definition).toEqual(definitionBefore);
    expect(definition.allowedTools).toBe(allowedTools);
    expect(Object.isFrozen(allowedTools)).toBe(false);
    expect(Object.isFrozen(definition)).toBe(false);

    allowedTools.push('files.write');
    expect(definition.allowedTools).toEqual(['files.read', 'future.search', 'files.write']);
  });

  it('returns a frozen Core-owned evaluation result', () => {
    const result = evaluateAgentToolAllowance(createTestAgent(), 'files.read');

    expect(Object.isFrozen(result)).toBe(true);
    expect(() => {
      (result as { isAllowed: boolean }).isAllowed = false;
    }).toThrow(TypeError);
  });
});

describe('assertAgentToolAllowed', () => {
  it('returns normally for an exact declared Tool ID', () => {
    expect(assertAgentToolAllowed(createTestAgent(), 'files.read')).toBeUndefined();
  });

  it('throws a structured Agent Tool allowlist error for a denied Tool ID', () => {
    let thrown: unknown;

    try {
      assertAgentToolAllowed(createTestAgent(), 'files.write');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AgentToolNotAllowedError);
    expect(thrown).toMatchObject({
      name: 'AgentToolNotAllowedError',
      message: 'Agent "research-agent" does not declare Tool "files.write" in allowedTools.',
      agentId: 'research-agent',
      toolId: 'files.write',
    });
  });

  it('preserves the exact Agent ID and requested Tool ID', () => {
    const definition = createTestAgent();
    const requestedToolId = 'Files.read';

    try {
      assertAgentToolAllowed(definition, requestedToolId);
      throw new Error('Expected Agent Tool allowlist denial');
    } catch (error) {
      expect(error).toBeInstanceOf(AgentToolNotAllowedError);
      expect(error).toMatchObject({
        agentId: definition.id,
        toolId: requestedToolId,
      });
    }
  });

  it('throws when the allowlist is empty', () => {
    expect(() => assertAgentToolAllowed(createTestAgent([]), 'files.read')).toThrow(
      AgentToolNotAllowedError,
    );
  });

  it('throws for a case mismatch', () => {
    expect(() => assertAgentToolAllowed(createTestAgent(), 'Files.read')).toThrow(
      AgentToolNotAllowedError,
    );
  });
});
