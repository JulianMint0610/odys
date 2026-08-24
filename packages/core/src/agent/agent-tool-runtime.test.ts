import { z } from 'zod';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  AgentToolNotAllowedError,
  createAgentRegistry,
  createAgentToolRuntime,
  createToolRegistry,
  createToolRuntime,
  defineAgent,
  defineTool,
  InvalidAgentToolRuntimeRequestError,
  InvalidToolRuntimePermissionResolutionError,
  ToolInputValidationError,
  ToolOutputValidationError,
  ToolPermissionDeniedError,
  UnknownAgentError,
  UnknownToolError,
  type AgentDefinition,
  type AgentToolRuntime,
  type AgentToolRuntimeRequest,
  type ToolDefinition,
  type ToolRuntime,
  type ToolRuntimeExecutor,
  type ToolRuntimePermissionIdentifierResolver,
  type ToolRuntimeResult,
} from '../index.js';

function createTestAgent(allowedTools: readonly string[], id = 'calendar-agent'): AgentDefinition {
  return defineAgent({
    id,
    name: `${id} Agent`,
    version: '0.1.0',
    description: `Fixture for ${id}.`,
    responsibility: `Test the ${id} Agent-to-Tool path.`,
    allowedTools,
  });
}

function createTestTool({
  id = 'calendar.create_event',
  requiredPermissions = ['calendar.write'],
  inputSchema = z.object({ title: z.string().trim() }),
  outputSchema = z.object({ eventId: z.string().trim() }),
}: {
  readonly id?: string;
  readonly requiredPermissions?: readonly string[];
  readonly inputSchema?: z.ZodType;
  readonly outputSchema?: z.ZodType;
} = {}): ToolDefinition {
  return defineTool({
    id,
    name: `${id} Tool`,
    description: `Fixture for ${id}.`,
    risk: 'high',
    inputSchema,
    outputSchema,
    requiredPermissions,
  });
}

function runtimeRequest(value: unknown): AgentToolRuntimeRequest {
  return value as AgentToolRuntimeRequest;
}

describe('Agent Tool Runtime', () => {
  it('exposes the narrow composition contract through the Core public API', async () => {
    const agentRegistry = createAgentRegistry();
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    const toolResult = Object.freeze({
      toolId: 'calendar.create_event',
      output: Object.freeze({ eventId: 'event-1' }),
    });
    const toolRuntime: ToolRuntime = {
      run: vi.fn(async ({ toolId, input }) => {
        expect(toolId).toBe('calendar.create_event');
        expect(input).toEqual({ title: 'Review' });
        return toolResult;
      }),
    };
    const runtime: AgentToolRuntime = createAgentToolRuntime({ agentRegistry, toolRuntime });
    const request: AgentToolRuntimeRequest = {
      agentId: 'calendar-agent',
      toolId: 'calendar.create_event',
      input: { title: 'Review' },
    };
    type RequestHasResolvedPermissions = 'resolvedPermissions' extends keyof AgentToolRuntimeRequest
      ? true
      : false;
    const requestHasResolvedPermissions: RequestHasResolvedPermissions = false;

    const result: ToolRuntimeResult = await runtime.run(request);

    expect(runtime.run).toBeTypeOf('function');
    expect(result).toBe(toolResult);
    expect(toolRuntime.run).toHaveBeenCalledOnce();
    expect(requestHasResolvedPermissions).toBe(false);
    expect(new InvalidAgentToolRuntimeRequestError('invalid')).toBeInstanceOf(Error);
    expectTypeOf(result).toEqualTypeOf<ToolRuntimeResult>();
  });

  it('guards the registered Agent and delegates the allowed request to the Tool Runtime', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    const registeredAgent = agentRegistry.register(createTestAgent(['calendar.create_event']));
    const registeredTool = toolRegistry.register(
      createTestTool({
        inputSchema: z.object({ title: z.string().trim() }).transform((input) => ({
          ...input,
          normalized: true,
        })),
        outputSchema: z.object({ eventId: z.string().trim() }),
      }),
    );
    let resolvedInput: unknown;
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async ({ tool, input }) => {
        expect(tool).toBe(registeredTool);
        resolvedInput = input;
        return ['calendar.write'];
      },
    );
    const executor: ToolRuntimeExecutor = vi.fn(async ({ tool, input }) => {
      expect(tool).toBe(registeredTool);
      expect(input).toBe(resolvedInput);
      expect(input).toEqual({ title: 'Review', normalized: true });
      return { eventId: '  event-1  ' };
    });
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    const result = await runtime.run({
      agentId: 'calendar-agent',
      toolId: 'calendar.create_event',
      input: { title: '  Review  ', privateExtra: 'removed' },
    });

    expect(agentRegistry.get('calendar-agent')).toBe(registeredAgent);
    expect(Object.isFrozen(registeredAgent)).toBe(true);
    expect(result).toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'event-1' },
    });
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
  });

  it.each([null, undefined, 1, 'request', [], () => undefined])(
    'rejects the non-object request %j before Agent or Tool resolution',
    async (request) => {
      const agentRegistry = createAgentRegistry();
      const toolRuntime: ToolRuntime = {
        run: vi.fn(async () => ({ toolId: 'unused', output: null })),
      };
      const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        InvalidAgentToolRuntimeRequestError,
      );
      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        'Invalid Agent Tool runtime request: request must be an object',
      );
      expect(toolRuntime.run).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: 'a missing Agent ID', request: { toolId: 'calendar.create_event', input: null } },
    {
      label: 'a non-canonical Agent ID',
      request: { agentId: 'Calendar-agent', toolId: 'calendar.create_event', input: null },
    },
    { label: 'a missing Tool ID', request: { agentId: 'calendar-agent', input: null } },
    {
      label: 'a non-canonical Tool ID',
      request: { agentId: 'calendar-agent', toolId: 'Calendar.create_event', input: null },
    },
    {
      label: 'a missing input',
      request: { agentId: 'calendar-agent', toolId: 'calendar.create_event' },
    },
  ])('rejects $label before Registry resolution or Tool delegation', async ({ request }) => {
    const agentRegistry = createAgentRegistry();
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    const toolRuntime: ToolRuntime = {
      run: vi.fn(async () => ({ toolId: 'unused', output: null })),
    };
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      InvalidAgentToolRuntimeRequestError,
    );
    expect(toolRuntime.run).not.toHaveBeenCalled();
  });

  it('rejects an unknown Agent before Tool Runtime delegation', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRuntime: ToolRuntime = {
      run: vi.fn(async () => ({ toolId: 'calendar.create_event', output: null })),
    };
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'unknown-agent',
        toolId: 'calendar.create_event',
        input: null,
      }),
    ).rejects.toThrow(UnknownAgentError);
    expect(toolRuntime.run).not.toHaveBeenCalled();
  });

  it('denies an undeclared Tool before permission resolution or execution', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent(['calendar.read_event']));
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).rejects.toMatchObject({
      name: 'AgentToolNotAllowedError',
      agentId: 'calendar-agent',
      toolId: 'calendar.create_event',
    });
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('denies every Tool for an Agent with an empty allowlist', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent([]));
    toolRegistry.register(createTestTool({ requiredPermissions: [] }));
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => [],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).rejects.toThrow(AgentToolNotAllowedError);
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('delegates an allowed but unknown Tool ID to the Tool Runtime', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent(['calendar.future_action']));
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => [],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => null);
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.future_action',
        input: null,
      }),
    ).rejects.toThrow(UnknownToolError);
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('preserves Tool-side permission denial after Agent allowance succeeds', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    toolRegistry.register(
      createTestTool({ requiredPermissions: ['calendar.write', 'calendar.invite'] }),
    );
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    let thrown: unknown;
    try {
      await runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolPermissionDeniedError);
    expect(thrown).toMatchObject({
      name: 'ToolPermissionDeniedError',
      toolId: 'calendar.create_event',
      missingPermissions: ['calendar.invite'],
    });
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('preserves existing Tool input validation semantics', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 1 },
      }),
    ).rejects.toThrow(ToolInputValidationError);
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('preserves existing Tool output validation semantics', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 1 }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).rejects.toThrow(ToolOutputValidationError);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
  });

  it('preserves malformed Tool permission resolution semantics', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers = vi.fn(async () => null);
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers:
        resolvePermissionIdentifiers as unknown as ToolRuntimePermissionIdentifierResolver,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).rejects.toThrow(InvalidToolRuntimePermissionResolutionError);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('propagates a Tool permission resolver rejection without wrapping or retrying', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    const failure = new Error('Resolver rejected');
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => {
        throw failure;
      },
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).rejects.toBe(failure);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('propagates a Tool executor rejection without wrapping or retrying', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    const failure = new Error('Executor rejected');
    agentRegistry.register(createTestAgent(['calendar.create_event']));
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => {
      throw failure;
    });
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).rejects.toBe(failure);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
  });

  it('uses the Agent Registry-owned snapshot after caller definition mutation', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    const allowedTools = ['calendar.create_event'];
    const callerAgent = createTestAgent(allowedTools);
    const registeredAgent = agentRegistry.register(callerAgent);
    toolRegistry.register(createTestTool({ requiredPermissions: [] }));
    toolRegistry.register(createTestTool({ id: 'calendar.delete_event', requiredPermissions: [] }));
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => [],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async ({ tool }) => ({ eventId: tool.id }));
    const toolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const runtime = createAgentToolRuntime({ agentRegistry, toolRuntime });

    allowedTools.splice(0, 1, 'calendar.delete_event');
    (callerAgent as { name: string }).name = 'Caller-mutated Agent';

    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.create_event',
        input: { title: 'Review' },
      }),
    ).resolves.toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'calendar.create_event' },
    });
    await expect(
      runtime.run({
        agentId: 'calendar-agent',
        toolId: 'calendar.delete_event',
        input: { title: 'Review' },
      }),
    ).rejects.toThrow(AgentToolNotAllowedError);

    expect(agentRegistry.get('calendar-agent')).toBe(registeredAgent);
    expect(registeredAgent.allowedTools).toEqual(['calendar.create_event']);
    expect(registeredAgent.name).toBe('calendar-agent Agent');
    expect(Object.isFrozen(callerAgent)).toBe(false);
    expect(Object.isFrozen(allowedTools)).toBe(false);
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).toHaveBeenCalledOnce();
  });
});
