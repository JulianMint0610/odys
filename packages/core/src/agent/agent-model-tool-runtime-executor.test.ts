import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import {
  AgentToolNotAllowedError,
  AgentToolTurnLimitExceededError,
  createAgentModelToolRuntimeExecutor,
  createAgentRegistry,
  createAgentToolRuntime,
  createToolRegistry,
  createToolRuntime,
  defineAgent,
  defineTool,
  ModelOutcomeValidationError,
  ToolInputValidationError,
  ToolOutputValidationError,
  ToolPermissionDeniedError,
  UnknownToolError,
  type AgentModelIdResolver,
  type AgentToolRuntime,
  type ModelRuntime,
  type ModelRuntimeResult,
  type ModelTurn,
  type ToolRuntimeExecutor,
  type ToolRuntimePermissionIdentifierResolver,
  type ToolRuntimeResult,
} from '../index.js';

const agentId = 'research-agent';
const modelId = 'reasoning-primary';
const toolId = 'calendar.lookup';

function createExecutorRequest(allowedTools: readonly string[] = [toolId]) {
  const agentRegistry = createAgentRegistry();
  const agent = agentRegistry.register(
    defineAgent({
      id: agentId,
      name: 'Research Agent',
      version: '0.1.0',
      description: 'Research Agent fixture.',
      responsibility: 'Exercise the bounded Model and Tool composition.',
      allowedTools,
    }),
  );
  const input = {
    prompt: 'Find the event.',
    modelId: 'caller-controlled-model',
    provider: 'caller-controlled-provider',
  };

  return { agentRegistry, input, request: { agent, input } };
}

function createRealAgentToolRuntime(options?: {
  readonly allowedTools?: readonly string[];
  readonly requiredPermissions?: readonly string[];
  readonly resolvedPermissions?: readonly string[];
  readonly executor?: ToolRuntimeExecutor;
}) {
  const { agentRegistry } = createExecutorRequest(options?.allowedTools);
  const toolRegistry = createToolRegistry();
  toolRegistry.register(
    defineTool({
      id: toolId,
      name: 'Calendar Lookup',
      description: 'Looks up a calendar event.',
      risk: 'low',
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.object({ eventId: z.string() }),
      requiredPermissions: options?.requiredPermissions ?? [],
    }),
  );
  const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
    async () => options?.resolvedPermissions ?? [],
  );
  const toolExecutor: ToolRuntimeExecutor =
    options?.executor ?? vi.fn(async () => ({ eventId: 'event-1' }));
  const toolRuntime = createToolRuntime({
    toolRegistry,
    resolvePermissionIdentifiers,
    executor: toolExecutor,
  });

  return {
    agentRegistry,
    agentToolRuntime: createAgentToolRuntime({ agentRegistry, toolRuntime }),
    resolvePermissionIdentifiers,
    toolExecutor,
  };
}

function modelResult(output: unknown): ModelRuntimeResult {
  return { modelId, output };
}

describe('Agent Model Tool Runtime Executor', () => {
  it('returns a direct final output by identity without reaching the Tool boundary', async () => {
    const { request } = createExecutorRequest();
    const output = { answer: 'No Tool required.' };
    const resolveModelId: AgentModelIdResolver = vi.fn(async (received) => {
      expect(received).toBe(request);
      return modelId;
    });
    let initialTurn: unknown;
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async (received) => {
        expect(received.modelId).toBe(modelId);
        initialTurn = received.input;
        expect(received.input).toMatchObject({ kind: 'initial', input: request });
        return modelResult({ kind: 'final', output });
      }),
    };
    const agentToolRuntime: AgentToolRuntime = { run: vi.fn() };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime,
      resolveModelId,
    });

    const result = await executor(request);

    expect(result).toBe(output);
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(agentToolRuntime.run).not.toHaveBeenCalled();
    expect(Object.keys(initialTurn as object)).toEqual(['kind', 'input']);
    expect(Object.isFrozen(initialTurn)).toBe(true);
    const ownedInitialTurn = initialTurn as Extract<ModelTurn, { kind: 'initial' }>;
    expect(ownedInitialTurn.input).toBe(request);
    expect(Object.isFrozen(request)).toBe(false);
  });

  it('executes one canonical Tool request and returns the continued final output', async () => {
    const { request } = createExecutorRequest();
    const toolInput = { query: 'review' };
    const finalOutput = { answer: 'Found event-1.' };
    const real = createRealAgentToolRuntime();
    let exactToolResult: ToolRuntimeResult | undefined;
    const agentToolRuntime: AgentToolRuntime = {
      run: vi.fn(async (received) => {
        const result = await real.agentToolRuntime.run(received);
        exactToolResult = result;
        return result;
      }),
    };
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => modelId);
    const rawToolRequest = {
      kind: 'tool-request',
      toolId,
      input: toolInput,
      ignoredProviderMetadata: true,
    };
    let initialTurn: unknown;
    let continuation: unknown;
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async (received) => {
        if (vi.mocked(modelRuntime.run).mock.calls.length === 1) {
          initialTurn = received.input;
          expect(received.modelId).toBe(modelId);
          expect(received.input).toMatchObject({ kind: 'initial', input: request });
          return modelResult(rawToolRequest);
        }

        continuation = received.input;
        expect(received.modelId).toBe(modelId);
        return modelResult({ kind: 'final', output: finalOutput });
      }),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime,
      resolveModelId,
    });

    const result = await executor(request);

    expect(result).toBe(finalOutput);
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelRuntime.run).toHaveBeenCalledTimes(2);
    expect(agentToolRuntime.run).toHaveBeenCalledOnce();
    expect(real.toolExecutor).toHaveBeenCalledOnce();
    expect(initialTurn).toMatchObject({ kind: 'initial', input: request });
    expect(Object.keys(initialTurn as object)).toEqual(['kind', 'input']);
    expect(Object.isFrozen(initialTurn)).toBe(true);
    const ownedInitialTurn = initialTurn as Extract<ModelTurn, { kind: 'initial' }>;
    expect(ownedInitialTurn.input).toBe(request);
    expect(continuation).toMatchObject({
      kind: 'tool-result',
      input: request,
      toolRequest: { kind: 'tool-request', toolId, input: toolInput },
      toolResult: { toolId, output: { eventId: 'event-1' } },
    });
    expect(Object.keys(continuation as object)).toEqual([
      'kind',
      'input',
      'toolRequest',
      'toolResult',
    ]);
    const ownedContinuation = continuation as Extract<ModelTurn, { kind: 'tool-result' }>;
    expect(Object.isFrozen(continuation)).toBe(true);
    expect(ownedContinuation.input).toBe(request);
    expect(Object.isFrozen(ownedContinuation.toolRequest)).toBe(true);
    expect(ownedContinuation.toolRequest).not.toBe(rawToolRequest);
    expect(Object.keys(ownedContinuation.toolRequest)).toEqual(['kind', 'toolId', 'input']);
    expect(ownedContinuation.toolRequest.input).toBe(toolInput);
    expect(ownedContinuation.toolResult).toBe(exactToolResult);
    expect(Object.isFrozen(request)).toBe(false);
    expect(Object.isFrozen(toolInput)).toBe(false);
    expect(Object.isFrozen(exactToolResult)).toBe(false);
  });

  it('rejects an invalid initial Model outcome before Tool execution or continuation', async () => {
    const { request } = createExecutorRequest();
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () => modelResult({ kind: 'ToolRequest', toolId, input: {} })),
    };
    const agentToolRuntime: AgentToolRuntime = { run: vi.fn() };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(ModelOutcomeValidationError);
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(agentToolRuntime.run).not.toHaveBeenCalled();
  });

  it('propagates an Agent Tool Runtime failure unchanged without continuation or retry', async () => {
    const { request } = createExecutorRequest();
    const failure = new Error('Agent Tool Runtime failed');
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () =>
        modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
      ),
    };
    const agentToolRuntime: AgentToolRuntime = {
      run: vi.fn(async () => {
        throw failure;
      }),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toBe(failure);
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(agentToolRuntime.run).toHaveBeenCalledOnce();
  });

  it('propagates a Tool executor failure unchanged without continuation or retry', async () => {
    const { request } = createExecutorRequest();
    const failure = new Error('Tool executor failed');
    const real = createRealAgentToolRuntime({
      executor: vi.fn(async () => {
        throw failure;
      }),
    });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () =>
        modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
      ),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime: real.agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toBe(failure);
    expect(real.toolExecutor).toHaveBeenCalledOnce();
    expect(modelRuntime.run).toHaveBeenCalledOnce();
  });

  it('stops after Agent Tool denial without permission resolution, Tool execution, or continuation', async () => {
    const { request } = createExecutorRequest([]);
    const real = createRealAgentToolRuntime({ allowedTools: [] });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () =>
        modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
      ),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime: real.agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(AgentToolNotAllowedError);
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(real.resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(real.toolExecutor).not.toHaveBeenCalled();
  });

  it('stops after invalid Tool input without permission resolution, Tool execution, or continuation', async () => {
    const { request } = createExecutorRequest();
    const real = createRealAgentToolRuntime();
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () => modelResult({ kind: 'tool-request', toolId, input: { query: 1 } })),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime: real.agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(ToolInputValidationError);
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(real.resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(real.toolExecutor).not.toHaveBeenCalled();
  });

  it('stops after unsatisfied Tool permissions without Tool execution or continuation', async () => {
    const { request } = createExecutorRequest();
    const real = createRealAgentToolRuntime({
      requiredPermissions: ['calendar.read'],
      resolvedPermissions: [],
    });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () =>
        modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
      ),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime: real.agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(ToolPermissionDeniedError);
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(real.resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(real.toolExecutor).not.toHaveBeenCalled();
  });

  it('does not expose invalid Tool output to a continuation Model call', async () => {
    const { request } = createExecutorRequest();
    const real = createRealAgentToolRuntime({
      executor: vi.fn(async () => ({ eventId: 1 })),
    });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () =>
        modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
      ),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime: real.agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(ToolOutputValidationError);
    expect(real.toolExecutor).toHaveBeenCalledOnce();
    expect(modelRuntime.run).toHaveBeenCalledOnce();
  });

  it('validates the continuation Model outcome and never starts a second Tool turn', async () => {
    const { request } = createExecutorRequest();
    const real = createRealAgentToolRuntime();
    const modelRuntime: ModelRuntime = {
      run: vi
        .fn()
        .mockResolvedValueOnce(
          modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
        )
        .mockResolvedValueOnce(modelResult({ kind: 'Final', output: 'invalid' })),
    };
    const agentToolRuntime: AgentToolRuntime = {
      run: vi.fn((received) => real.agentToolRuntime.run(received)),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(ModelOutcomeValidationError);
    expect(modelRuntime.run).toHaveBeenCalledTimes(2);
    expect(agentToolRuntime.run).toHaveBeenCalledOnce();
    expect(real.toolExecutor).toHaveBeenCalledOnce();
  });

  it('fails closed on a second Tool request with exact bounded call counts and safe metadata', async () => {
    const { request } = createExecutorRequest();
    const real = createRealAgentToolRuntime();
    const secondInput = { private: 'must-not-leak' };
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => modelId);
    const modelRuntime: ModelRuntime = {
      run: vi
        .fn()
        .mockResolvedValueOnce(
          modelResult({ kind: 'tool-request', toolId, input: { query: 'review' } }),
        )
        .mockResolvedValueOnce(
          modelResult({ kind: 'tool-request', toolId: 'calendar.create', input: secondInput }),
        ),
    };
    const agentToolRuntime: AgentToolRuntime = {
      run: vi.fn((received) => real.agentToolRuntime.run(received)),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime,
      resolveModelId,
    });

    let thrown: unknown;
    try {
      await executor(request);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AgentToolTurnLimitExceededError);
    expect(thrown).toMatchObject({
      name: 'AgentToolTurnLimitExceededError',
      agentId,
      toolId: 'calendar.create',
      maximumToolTurns: 1,
    });
    expect((thrown as Error).message).not.toContain('must-not-leak');
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelRuntime.run).toHaveBeenCalledTimes(2);
    expect(agentToolRuntime.run).toHaveBeenCalledOnce();
    expect(real.toolExecutor).toHaveBeenCalledOnce();
  });

  it('preserves unknown-but-canonical Tool failure semantics without continuation', async () => {
    const { request } = createExecutorRequest(['calendar.unknown']);
    const real = createRealAgentToolRuntime({ allowedTools: ['calendar.unknown'] });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () =>
        modelResult({
          kind: 'tool-request',
          toolId: 'calendar.unknown',
          input: { query: 'review' },
        }),
      ),
    };
    const executor = createAgentModelToolRuntimeExecutor({
      modelRuntime,
      agentToolRuntime: real.agentToolRuntime,
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(executor(request)).rejects.toThrow(UnknownToolError);
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(real.toolExecutor).not.toHaveBeenCalled();
  });

  it.each(['resolver', 'model'] as const)(
    'propagates a %s failure unchanged without retry',
    async (source) => {
      const { request } = createExecutorRequest();
      const failure = new Error(`${source} failure`);
      const resolveModelId: AgentModelIdResolver = vi.fn(async () => {
        if (source === 'resolver') throw failure;
        return modelId;
      });
      const modelRuntime: ModelRuntime = {
        run: vi.fn(async () => {
          throw failure;
        }),
      };
      const agentToolRuntime: AgentToolRuntime = { run: vi.fn() };
      const executor = createAgentModelToolRuntimeExecutor({
        modelRuntime,
        agentToolRuntime,
        resolveModelId,
      });

      await expect(executor(request)).rejects.toBe(failure);
      expect(resolveModelId).toHaveBeenCalledOnce();
      expect(modelRuntime.run).toHaveBeenCalledTimes(source === 'resolver' ? 0 : 1);
      expect(agentToolRuntime.run).not.toHaveBeenCalled();
    },
  );

  it('keeps executor instances isolated', async () => {
    const { request } = createExecutorRequest();
    const firstOutput = { executor: 'first' };
    const secondOutput = { executor: 'second' };
    const firstModelRuntime: ModelRuntime = {
      run: vi.fn(async () => modelResult({ kind: 'final', output: firstOutput })),
    };
    const secondModelRuntime: ModelRuntime = {
      run: vi.fn(async () => modelResult({ kind: 'final', output: secondOutput })),
    };
    const first = createAgentModelToolRuntimeExecutor({
      modelRuntime: firstModelRuntime,
      agentToolRuntime: { run: vi.fn() },
      resolveModelId: vi.fn(async () => modelId),
    });
    const second = createAgentModelToolRuntimeExecutor({
      modelRuntime: secondModelRuntime,
      agentToolRuntime: { run: vi.fn() },
      resolveModelId: vi.fn(async () => modelId),
    });

    await expect(first(request)).resolves.toBe(firstOutput);
    await expect(second(request)).resolves.toBe(secondOutput);
    expect(firstModelRuntime.run).toHaveBeenCalledOnce();
    expect(secondModelRuntime.run).toHaveBeenCalledOnce();
  });
});
