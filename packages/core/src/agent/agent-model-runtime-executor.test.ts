import { describe, expect, it, vi } from 'vitest';

import {
  createAgentRegistry,
  createAgentRuntime,
  createModelBackedAgentRuntimeExecutor,
  createModelRegistry,
  createModelRuntime,
  defineAgent,
  defineModel,
  InvalidAgentRuntimeRequestError,
  InvalidModelRuntimeRequestError,
  UnknownAgentError,
  UnknownModelError,
  type AgentDefinition,
  type AgentModelIdResolver,
  type AgentRuntimeExecutor,
  type AgentRuntimeRequest,
  type ModelDefinition,
  type ModelRuntime,
  type ModelRuntimeExecutor,
  type ModelRuntimeResult,
} from '../index.js';

function createTestAgent(
  id = 'coding-agent',
  allowedTools: readonly string[] = [],
): AgentDefinition {
  return defineAgent({
    id,
    name: `${id} Agent`,
    version: '0.1.0',
    description: `Fixture for ${id}.`,
    responsibility: `Test the ${id} Agent-to-Model path.`,
    allowedTools,
  });
}

function createTestModel(
  id = 'coding-primary',
  provider = 'example-provider',
  providerModelId = 'provider-owned-model',
): ModelDefinition {
  return defineModel({ id, provider, providerModelId });
}

function runtimeRequest(value: unknown): AgentRuntimeRequest {
  return value as AgentRuntimeRequest;
}

describe('Agent Model Runtime Executor', () => {
  it('composes the exact registered Agent and input with the exact registered Model once', async () => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    const callerAgent = createTestAgent();
    const callerModel = createTestModel();
    const input = { prompt: 'Review this repository.' };
    const modelOutput = { summary: 'Repository reviewed.' };
    const registeredAgent = agentRegistry.register(callerAgent);
    const registeredModel = modelRegistry.register(callerModel);
    let resolverRequest: Parameters<AgentRuntimeExecutor>[0] | undefined;
    const resolveModelId: AgentModelIdResolver = vi.fn(async (request) => {
      resolverRequest = request;
      expect(request.agent).toBe(registeredAgent);
      expect(request.agent).not.toBe(callerAgent);
      expect(request.input).toBe(input);
      return 'coding-primary';
    });
    const modelExecutor: ModelRuntimeExecutor = vi.fn(async ({ model, input: modelInput }) => {
      expect(model).toBe(registeredModel);
      expect(model).not.toBe(callerModel);
      expect(modelInput).toBe(resolverRequest);
      expect(modelInput).toMatchObject({ agent: registeredAgent, input });
      return modelOutput;
    });
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor: AgentRuntimeExecutor = createModelBackedAgentRuntimeExecutor({
      modelRuntime,
      resolveModelId,
    });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    const result = await runtime.run({ agentId: 'coding-agent', input });

    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelExecutor).toHaveBeenCalledOnce();
    expect(result).toEqual({
      agentId: 'coding-agent',
      output: {
        modelId: 'coding-primary',
        output: modelOutput,
      },
    });
    expect((result.output as ModelRuntimeResult).output).toBe(modelOutput);
  });

  it('returns the exact Model Runtime result and leaves ToolRequest-like output opaque', async () => {
    const agentRegistry = createAgentRegistry();
    const registeredAgent = agentRegistry.register(createTestAgent());
    const modelOutput = Object.freeze({
      type: 'tool_request',
      toolId: 'calendar.create_event',
    });
    const modelResult: ModelRuntimeResult = Object.freeze({
      modelId: 'coding-primary',
      output: modelOutput,
    });
    let resolverRequest: Parameters<AgentRuntimeExecutor>[0] | undefined;
    const resolveModelId: AgentModelIdResolver = vi.fn(async (request) => {
      resolverRequest = request;
      return 'coding-primary';
    });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async (request) => {
        expect(request).toEqual({ modelId: 'coding-primary', input: resolverRequest });
        expect(request.input).toBe(resolverRequest);
        expect(request.input).toMatchObject({ agent: registeredAgent });
        return modelResult;
      }),
    };
    const toolRuntimeRun = vi.fn();
    const agentToolRuntimeRun = vi.fn();
    const compositionOptions = {
      modelRuntime,
      resolveModelId,
      toolRuntime: { run: toolRuntimeRun },
      agentToolRuntime: { run: agentToolRuntimeRun },
    };
    const executor = createModelBackedAgentRuntimeExecutor(compositionOptions);
    const runtime = createAgentRuntime({ agentRegistry, executor });
    type FactoryOptions = Parameters<typeof createModelBackedAgentRuntimeExecutor>[0];
    type HasToolRuntime = 'toolRuntime' extends keyof FactoryOptions ? true : false;
    type HasAgentToolRuntime = 'agentToolRuntime' extends keyof FactoryOptions ? true : false;
    const hasToolRuntime: HasToolRuntime = false;
    const hasAgentToolRuntime: HasAgentToolRuntime = false;

    const result = await runtime.run({ agentId: 'coding-agent', input: null });

    expect(result.output).toBe(modelResult);
    expect((result.output as ModelRuntimeResult).output).toBe(modelOutput);
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelRuntime.run).toHaveBeenCalledOnce();
    expect(toolRuntimeRun).not.toHaveBeenCalled();
    expect(agentToolRuntimeRun).not.toHaveBeenCalled();
    expect(hasToolRuntime).toBe(false);
    expect(hasAgentToolRuntime).toBe(false);
  });

  it('rejects an invalid Agent request before resolving or invoking the Model Runtime', async () => {
    const agentRegistry = createAgentRegistry();
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => 'coding-primary');
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () => ({ modelId: 'coding-primary', output: null })),
    };
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(
      runtime.run(runtimeRequest({ agentId: 'Coding-agent', input: null })),
    ).rejects.toThrow(InvalidAgentRuntimeRequestError);
    expect(resolveModelId).not.toHaveBeenCalled();
    expect(modelRuntime.run).not.toHaveBeenCalled();
  });

  it('rejects an unknown Agent before resolving or invoking the Model Runtime', async () => {
    const agentRegistry = createAgentRegistry();
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => 'coding-primary');
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () => ({ modelId: 'coding-primary', output: null })),
    };
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'unknown-agent', input: null })).rejects.toThrow(
      UnknownAgentError,
    );
    expect(resolveModelId).not.toHaveBeenCalled();
    expect(modelRuntime.run).not.toHaveBeenCalled();
  });

  it('preserves a synchronous resolver failure and does not invoke the Model Runtime', async () => {
    const agentRegistry = createAgentRegistry();
    const failure = new Error('Resolver failed synchronously');
    agentRegistry.register(createTestAgent());
    const resolveModelId: AgentModelIdResolver = vi.fn(() => {
      throw failure;
    });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () => ({ modelId: 'coding-primary', output: null })),
    };
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toBe(failure);
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelRuntime.run).not.toHaveBeenCalled();
  });

  it('preserves an asynchronous resolver rejection and does not invoke the Model Runtime', async () => {
    const agentRegistry = createAgentRegistry();
    const failure = new Error('Resolver rejected');
    agentRegistry.register(createTestAgent());
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => {
      throw failure;
    });
    const modelRuntime: ModelRuntime = {
      run: vi.fn(async () => ({ modelId: 'coding-primary', output: null })),
    };
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toBe(failure);
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelRuntime.run).not.toHaveBeenCalled();
  });

  it('delegates malformed logical Model IDs to existing Model Runtime validation', async () => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    agentRegistry.register(createTestAgent());
    const resolveModelId = vi.fn(async () => 'Invalid Model ID') as AgentModelIdResolver;
    const modelExecutor: ModelRuntimeExecutor = vi.fn(async () => null);
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toThrow(
      InvalidModelRuntimeRequestError,
    );
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelExecutor).not.toHaveBeenCalled();
  });

  it('preserves existing unknown logical Model semantics', async () => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    agentRegistry.register(createTestAgent());
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => 'unknown-model');
    const modelExecutor: ModelRuntimeExecutor = vi.fn(async () => null);
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toThrow(
      UnknownModelError,
    );
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelExecutor).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'synchronous failure',
      createExecutor: (failure: Error): ModelRuntimeExecutor =>
        vi.fn(() => {
          throw failure;
        }),
    },
    {
      label: 'asynchronous rejection',
      createExecutor: (failure: Error): ModelRuntimeExecutor =>
        vi.fn(async () => {
          throw failure;
        }),
    },
  ])('preserves Model executor $label without retry', async ({ createExecutor }) => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    const failure = new Error('Model executor failed');
    agentRegistry.register(createTestAgent());
    modelRegistry.register(createTestModel());
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => 'coding-primary');
    const modelExecutor = createExecutor(failure);
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toBe(failure);
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelExecutor).toHaveBeenCalledOnce();
  });

  it('observes Agent and Model registrations made after Runtime construction', async () => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    const resolveModelId: AgentModelIdResolver = vi.fn(async () => 'coding-primary');
    const modelExecutor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    agentRegistry.register(createTestAgent());
    modelRegistry.register(createTestModel());

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).resolves.toEqual({
      agentId: 'coding-agent',
      output: { modelId: 'coding-primary', output: 'completed' },
    });
  });

  it('keeps independent Agent-to-Model compositions isolated', async () => {
    const firstAgentRegistry = createAgentRegistry();
    const secondAgentRegistry = createAgentRegistry();
    const firstModelRegistry = createModelRegistry();
    const secondModelRegistry = createModelRegistry();
    firstAgentRegistry.register(createTestAgent());
    secondAgentRegistry.register(createTestAgent());
    firstModelRegistry.register(createTestModel('first-model'));
    secondModelRegistry.register(createTestModel('second-model'));
    const firstResolver: AgentModelIdResolver = vi.fn(async () => 'first-model');
    const secondResolver: AgentModelIdResolver = vi.fn(async () => 'second-model');
    const firstModelExecutor: ModelRuntimeExecutor = vi.fn(async () => 'first');
    const secondModelExecutor: ModelRuntimeExecutor = vi.fn(async () => 'second');
    const firstRuntime = createAgentRuntime({
      agentRegistry: firstAgentRegistry,
      executor: createModelBackedAgentRuntimeExecutor({
        modelRuntime: createModelRuntime({
          modelRegistry: firstModelRegistry,
          executor: firstModelExecutor,
        }),
        resolveModelId: firstResolver,
      }),
    });
    const secondRuntime = createAgentRuntime({
      agentRegistry: secondAgentRegistry,
      executor: createModelBackedAgentRuntimeExecutor({
        modelRuntime: createModelRuntime({
          modelRegistry: secondModelRegistry,
          executor: secondModelExecutor,
        }),
        resolveModelId: secondResolver,
      }),
    });

    await expect(firstRuntime.run({ agentId: 'coding-agent', input: null })).resolves.toEqual({
      agentId: 'coding-agent',
      output: { modelId: 'first-model', output: 'first' },
    });
    await expect(secondRuntime.run({ agentId: 'coding-agent', input: null })).resolves.toEqual({
      agentId: 'coding-agent',
      output: { modelId: 'second-model', output: 'second' },
    });
    expect(firstResolver).toHaveBeenCalledOnce();
    expect(secondResolver).toHaveBeenCalledOnce();
    expect(firstModelExecutor).toHaveBeenCalledOnce();
    expect(secondModelExecutor).toHaveBeenCalledOnce();
  });

  it('does not use allowedTools or model-like Agent input fields as Model authority', async () => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    const input = {
      modelId: 'attacker-model',
      provider: 'attacker-provider',
      providerModelId: 'attacker-provider-model',
    };
    const registeredAgent = agentRegistry.register(createTestAgent('coding-agent', []));
    const trustedModel = modelRegistry.register(
      createTestModel('trusted-model', 'trusted-provider', 'trusted-provider-model'),
    );
    modelRegistry.register(
      createTestModel('attacker-model', 'attacker-provider', 'attacker-provider-model'),
    );
    const resolveModelId: AgentModelIdResolver = vi.fn(async ({ agent, input: agentInput }) => {
      expect(agent).toBe(registeredAgent);
      expect(agent.allowedTools).toEqual([]);
      expect(agentInput).toBe(input);
      return 'trusted-model';
    });
    const modelExecutor: ModelRuntimeExecutor = vi.fn(async ({ model, input: modelInput }) => {
      expect(model).toBe(trustedModel);
      expect(model.id).toBe('trusted-model');
      expect(modelInput).toMatchObject({
        agent: registeredAgent,
        input,
      });
      expect(modelInput).not.toMatchObject({
        modelId: 'attacker-model',
        provider: 'attacker-provider',
        providerModelId: 'attacker-provider-model',
      });
      return 'trusted';
    });
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'coding-agent', input })).resolves.toEqual({
      agentId: 'coding-agent',
      output: { modelId: 'trusted-model', output: 'trusted' },
    });
    expect(resolveModelId).toHaveBeenCalledOnce();
    expect(modelExecutor).toHaveBeenCalledOnce();
  });

  it('uses Registry snapshots without mutating or freezing caller-owned definitions or input', async () => {
    const agentRegistry = createAgentRegistry();
    const modelRegistry = createModelRegistry();
    const allowedTools = ['files.read'];
    const callerAgent = createTestAgent('coding-agent', allowedTools);
    const callerModel = createTestModel('coding-primary', 'provider-a', 'model-a');
    const input = { prompt: 'Review this repository.' };
    const registeredAgent = agentRegistry.register(callerAgent);
    const registeredModel = modelRegistry.register(callerModel);
    const resolveModelId: AgentModelIdResolver = vi.fn(async ({ agent, input: agentInput }) => {
      expect(agent).toBe(registeredAgent);
      expect(agent.name).toBe('coding-agent Agent');
      expect(agent.allowedTools).toEqual(['files.read']);
      expect(agentInput).toBe(input);
      return 'coding-primary';
    });
    const modelExecutor: ModelRuntimeExecutor = vi.fn(async ({ model, input: modelInput }) => {
      expect(model).toBe(registeredModel);
      expect(model.provider).toBe('provider-a');
      expect(model.providerModelId).toBe('model-a');
      expect(modelInput).toMatchObject({ agent: registeredAgent, input });
      return 'completed';
    });
    const modelRuntime = createModelRuntime({ modelRegistry, executor: modelExecutor });
    const executor = createModelBackedAgentRuntimeExecutor({ modelRuntime, resolveModelId });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    (callerAgent as { name: string }).name = 'Caller-mutated Agent';
    allowedTools.splice(0, 1, 'files.write');
    (callerModel as { provider: string }).provider = 'provider-b';
    (callerModel as { providerModelId: string }).providerModelId = 'model-b';

    await runtime.run({ agentId: 'coding-agent', input });

    expect(agentRegistry.get('coding-agent')).toBe(registeredAgent);
    expect(modelRegistry.get('coding-primary')).toBe(registeredModel);
    expect(Object.isFrozen(callerAgent)).toBe(false);
    expect(Object.isFrozen(allowedTools)).toBe(false);
    expect(Object.isFrozen(callerModel)).toBe(false);
    expect(Object.isFrozen(input)).toBe(false);
    expect(input).toEqual({ prompt: 'Review this repository.' });
    expect(callerAgent.name).toBe('Caller-mutated Agent');
    expect(callerModel.provider).toBe('provider-b');
  });
});
