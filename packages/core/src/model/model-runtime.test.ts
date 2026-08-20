import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import {
  createAgentRegistry,
  createModelRegistry,
  createModelRuntime,
  createToolRegistry,
  defineAgent,
  defineModel,
  defineTool,
  InvalidModelRuntimeRequestError,
  UnknownModelError,
  type ModelDefinition,
  type ModelRuntime,
  type ModelRuntimeExecutor,
  type ModelRuntimeRequest,
  type ModelRuntimeResult,
} from '../index.js';

function createTestModel(id: string): ModelDefinition {
  return defineModel({
    id,
    provider: 'example-provider',
    providerModelId: 'provider-owned-model',
  });
}

function runtimeRequest(value: unknown): ModelRuntimeRequest {
  return value as ModelRuntimeRequest;
}

describe('Model Runtime', () => {
  it('exposes the registered-Model Runtime contract through the Core public API', () => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => null);
    const runtime: ModelRuntime = createModelRuntime({ modelRegistry, executor });
    const request: ModelRuntimeRequest = { modelId: 'coding-primary', input: null };
    type RequestHasProvider = 'provider' extends keyof ModelRuntimeRequest ? true : false;
    type RequestHasProviderModelId = 'providerModelId' extends keyof ModelRuntimeRequest
      ? true
      : false;
    const requestHasProvider: RequestHasProvider = false;
    const requestHasProviderModelId: RequestHasProviderModelId = false;

    expect(runtime.run).toBeTypeOf('function');
    expect(request).toEqual({ modelId: 'coding-primary', input: null });
    expect(requestHasProvider).toBe(false);
    expect(requestHasProviderModelId).toBe(false);
  });

  it('dispatches the exact registered Model and opaque input exactly once', async () => {
    const modelRegistry = createModelRegistry();
    const model = createTestModel('coding-primary');
    const input = { messages: [{ role: 'user', content: 'Review this repository.' }] };
    const output = { content: [{ type: 'text', text: 'Repository reviewed.' }] };
    const registeredModel = modelRegistry.register(model);
    const executor: ModelRuntimeExecutor = vi.fn(async (request) => {
      expect(request.model).toBe(registeredModel);
      expect(request.model).not.toBe(model);
      expect(request.input).toBe(input);
      return output;
    });
    const runtime: ModelRuntime = createModelRuntime({ modelRegistry, executor });

    const result: ModelRuntimeResult = await runtime.run({
      modelId: 'coding-primary',
      input,
    });

    expect(executor).toHaveBeenCalledOnce();
    expect(result).toEqual({ modelId: 'coding-primary', output });
    expect(result.output).toBe(output);
  });

  it('keeps registered Provider dispatch metadata stable after caller mutation', async () => {
    const modelRegistry = createModelRegistry();
    const model = defineModel({
      id: 'coding-primary',
      provider: 'provider-a',
      providerModelId: 'model-a',
    });
    const registeredModel = modelRegistry.register(model);
    const executor: ModelRuntimeExecutor = vi.fn(async ({ model: dispatchedModel }) => {
      expect(dispatchedModel).toBe(registeredModel);
      expect(dispatchedModel).not.toBe(model);
      expect(dispatchedModel.provider).toBe('provider-a');
      expect(dispatchedModel.providerModelId).toBe('model-a');
      return 'completed';
    });
    const runtime = createModelRuntime({ modelRegistry, executor });

    (model as { provider: string; providerModelId: string }).provider = 'provider-b';
    (model as { provider: string; providerModelId: string }).providerModelId = 'model-b';

    expect(modelRegistry.get('coding-primary')).toBe(registeredModel);
    expect(modelRegistry.get('coding-primary')).toEqual({
      id: 'coding-primary',
      provider: 'provider-a',
      providerModelId: 'model-a',
    });
    await expect(runtime.run({ modelId: 'coding-primary', input: null })).resolves.toEqual({
      modelId: 'coding-primary',
      output: 'completed',
    });
    expect(executor).toHaveBeenCalledOnce();
  });

  it.each([null, undefined, 1, 'request', [], () => undefined])(
    'rejects the non-object Runtime request %j before dispatch',
    async (request) => {
      const modelRegistry = createModelRegistry();
      const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
      const runtime = createModelRuntime({ modelRegistry, executor });

      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        InvalidModelRuntimeRequestError,
      );
      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        'Invalid Model runtime request: request must be an object',
      );
      expect(executor).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: 'a missing Model ID', request: { input: null } },
    { label: 'a null Model ID', request: { modelId: null, input: null } },
    { label: 'a numeric Model ID', request: { modelId: 1, input: null } },
    { label: 'an empty Model ID', request: { modelId: '', input: null } },
    { label: 'a whitespace Model ID', request: { modelId: '   ', input: null } },
    { label: 'an uppercase Model ID', request: { modelId: 'Coding-primary', input: null } },
    { label: 'a padded Model ID', request: { modelId: ' coding-primary ', input: null } },
    {
      label: 'a repeated separator Model ID',
      request: { modelId: 'coding--primary', input: null },
    },
  ])('rejects $label without normalization or dispatch', async ({ request }) => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });

    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      InvalidModelRuntimeRequestError,
    );
    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      'Invalid Model runtime request: modelId must be a canonical Model identifier',
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it('requires an own input property before dispatch', async () => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });
    const inheritedInputRequest = Object.assign(Object.create({ input: 'inherited' }), {
      modelId: 'coding-primary',
    }) as ModelRuntimeRequest;

    await expect(runtime.run(runtimeRequest({ modelId: 'coding-primary' }))).rejects.toThrow(
      InvalidModelRuntimeRequestError,
    );
    await expect(runtime.run(inheritedInputRequest)).rejects.toThrow(
      'Invalid Model runtime request: input must be provided',
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'undefined', input: undefined },
    { label: 'null', input: null },
  ])('accepts an explicitly provided $label input', async ({ input }) => {
    const modelRegistry = createModelRegistry();
    const model = createTestModel('coding-primary');
    const executor: ModelRuntimeExecutor = vi.fn(async (request) => request.input);
    const runtime = createModelRuntime({ modelRegistry, executor });

    modelRegistry.register(model);

    await expect(runtime.run({ modelId: 'coding-primary', input })).resolves.toEqual({
      modelId: 'coding-primary',
      output: input,
    });
    expect(executor).toHaveBeenCalledOnce();
  });

  it('rejects an unknown canonical Model deterministically without dispatch', async () => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });

    await expect(runtime.run({ modelId: 'unknown-model', input: null })).rejects.toThrow(
      UnknownModelError,
    );
    await expect(runtime.run({ modelId: 'unknown-model', input: null })).rejects.toThrow(
      'Model with id "unknown-model" is not registered',
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it('uses only the logical Model ID for Registry resolution', async () => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });

    modelRegistry.register(createTestModel('coding-primary'));

    await expect(runtime.run({ modelId: 'example-provider', input: null })).rejects.toThrow(
      UnknownModelError,
    );
    await expect(runtime.run({ modelId: 'provider-owned-model', input: null })).rejects.toThrow(
      UnknownModelError,
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it('does not let caller-supplied provider metadata affect Model resolution', async () => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });
    const request = {
      modelId: 'unknown-model',
      input: null,
      provider: 'example-provider',
      providerModelId: 'provider-owned-model',
    } as ModelRuntimeRequest;

    modelRegistry.register(createTestModel('coding-primary'));

    await expect(runtime.run(request)).rejects.toThrow(UnknownModelError);
    expect(executor).not.toHaveBeenCalled();
  });

  it('propagates an asynchronous executor rejection without wrapping or retrying', async () => {
    const modelRegistry = createModelRegistry();
    const failure = new Error('Executor failed');
    const executor: ModelRuntimeExecutor = vi.fn(async () => {
      throw failure;
    });
    const runtime = createModelRuntime({ modelRegistry, executor });

    modelRegistry.register(createTestModel('coding-primary'));

    await expect(runtime.run({ modelId: 'coding-primary', input: null })).rejects.toBe(failure);
    expect(executor).toHaveBeenCalledOnce();
  });

  it('propagates a synchronous executor failure without wrapping or retrying', async () => {
    const modelRegistry = createModelRegistry();
    const failure = new Error('Executor failed synchronously');
    const executor: ModelRuntimeExecutor = vi.fn(() => {
      throw failure;
    });
    const runtime = createModelRuntime({ modelRegistry, executor });

    modelRegistry.register(createTestModel('coding-primary'));

    await expect(runtime.run({ modelId: 'coding-primary', input: null })).rejects.toBe(failure);
    expect(executor).toHaveBeenCalledOnce();
  });

  it('resolves Models registered after Runtime construction', async () => {
    const modelRegistry = createModelRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });

    modelRegistry.register(createTestModel('coding-primary'));

    await expect(runtime.run({ modelId: 'coding-primary', input: null })).resolves.toEqual({
      modelId: 'coding-primary',
      output: 'completed',
    });
  });

  it('keeps separate Registry and Runtime compositions isolated', async () => {
    const firstRegistry = createModelRegistry();
    const secondRegistry = createModelRegistry();
    const firstExecutor: ModelRuntimeExecutor = vi.fn(async () => 'first');
    const secondExecutor: ModelRuntimeExecutor = vi.fn(async () => 'second');
    const firstRuntime = createModelRuntime({
      modelRegistry: firstRegistry,
      executor: firstExecutor,
    });
    const secondRuntime = createModelRuntime({
      modelRegistry: secondRegistry,
      executor: secondExecutor,
    });

    firstRegistry.register(createTestModel('coding-primary'));

    await expect(firstRuntime.run({ modelId: 'coding-primary', input: null })).resolves.toEqual({
      modelId: 'coding-primary',
      output: 'first',
    });
    await expect(secondRuntime.run({ modelId: 'coding-primary', input: null })).rejects.toThrow(
      UnknownModelError,
    );
    expect(firstExecutor).toHaveBeenCalledOnce();
    expect(secondExecutor).not.toHaveBeenCalled();
  });

  it('does not derive Model dispatch eligibility from Agent or Tool Registry membership', async () => {
    const modelRegistry = createModelRegistry();
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    const executor: ModelRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createModelRuntime({ modelRegistry, executor });

    agentRegistry.register(
      defineAgent({
        id: 'coding-primary',
        name: 'Coding Agent',
        version: '0.1.0',
        description: 'A Model Runtime boundary fixture.',
        responsibility: 'Verify Registry independence.',
      }),
    );
    toolRegistry.register(
      defineTool({
        id: 'coding-primary',
        name: 'Coding Tool',
        description: 'A Model Runtime boundary fixture.',
        risk: 'low',
        inputSchema: z.unknown(),
        outputSchema: z.unknown(),
        requiredPermissions: [],
      }),
    );

    await expect(runtime.run({ modelId: 'coding-primary', input: null })).rejects.toThrow(
      UnknownModelError,
    );
    expect(agentRegistry.has('coding-primary')).toBe(true);
    expect(toolRegistry.has('coding-primary')).toBe(true);
    expect(executor).not.toHaveBeenCalled();
  });
});
