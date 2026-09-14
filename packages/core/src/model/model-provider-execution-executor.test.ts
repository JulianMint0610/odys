import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  createInitialModelTurn,
  createModelExecutionRequest,
  createModelProviderExecutionExecutor,
  createModelRegistry,
  createModelRequest,
  createModelResponse,
  createToolResultModelTurn,
  defineModel,
  type ModelExecutionRequest,
  type ModelExecutionResult,
  type ModelProviderAdapter,
  type ModelProviderExecutionExecutor as CoreModelProviderExecutionExecutor,
  type ModelRequest,
  type ModelRequestNormalizer as CoreModelRequestNormalizer,
  type ModelResponse,
  type ModelToolRequest,
  type ModelTurn,
} from '../index.js';
import type { ModelProviderExecutionExecutor, ModelRequestNormalizer } from './index.js';

function createRegisteredModel() {
  const modelRegistry = createModelRegistry();

  return modelRegistry.register(
    defineModel({
      id: 'general',
      provider: 'test-provider',
      providerModelId: 'provider/general:v1',
    }),
  );
}

function createCanonicalRequest() {
  return createModelRequest({
    instructions: ['Answer the request.'],
    input: [{ kind: 'message', role: 'user', content: { prompt: 'Find the event.' } }],
    tools: [],
  });
}

function createCanonicalResponse() {
  return createModelResponse({
    content: { text: 'Event found.' },
    structuredOutput: undefined,
    toolRequests: [],
    finishReason: 'stop',
  });
}

describe('Model Provider Execution Executor', () => {
  it('exposes the provider-independent composition through the Model and Core public APIs', () => {
    expectTypeOf<ModelRequestNormalizer>().toEqualTypeOf<(turn: ModelTurn) => ModelRequest>();
    expectTypeOf<ModelProviderExecutionExecutor>().toEqualTypeOf<
      (request: ModelExecutionRequest) => Promise<ModelExecutionResult>
    >();
    expectTypeOf<CoreModelRequestNormalizer>().toEqualTypeOf<ModelRequestNormalizer>();
    expectTypeOf<CoreModelProviderExecutionExecutor>().toEqualTypeOf<ModelProviderExecutionExecutor>();
  });

  it('normalizes an initial turn and invokes the Provider Adapter once with exact references', async () => {
    const model = createRegisteredModel();
    const input = { prompt: 'Find the event.' };
    const turn = createInitialModelTurn(input);
    const executionRequest = createModelExecutionRequest({ model, turn });
    const normalizedRequest = createCanonicalRequest();
    const adapterResponse = createCanonicalResponse();
    let receivedTurn: unknown;
    let receivedModel: unknown;
    let receivedModelRequest: unknown;
    const requestNormalizer: ModelRequestNormalizer = vi.fn((received) => {
      receivedTurn = received;
      return normalizedRequest;
    });
    const providerAdapter: ModelProviderAdapter = {
      execute: vi.fn(async ({ model: received, request }) => {
        receivedModel = received;
        receivedModelRequest = request;
        return adapterResponse;
      }),
    };
    const executor = createModelProviderExecutionExecutor({
      requestNormalizer,
      providerAdapter,
    });

    const result = await executor(executionRequest);

    expect(requestNormalizer).toHaveBeenCalledOnce();
    expect(providerAdapter.execute).toHaveBeenCalledOnce();
    expect(receivedTurn).toBe(turn);
    expect(receivedTurn).toBe(executionRequest.turn);
    expect(receivedModel).toBe(model);
    expect(receivedModel).toBe(executionRequest.model);
    expect(receivedModelRequest).toBe(normalizedRequest);
    expect(result.output).toBe(adapterResponse);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('passes a Tool-result turn unchanged without special-casing or reinterpretation', async () => {
    const model = createRegisteredModel();
    const input = { prompt: 'Find the event.' };
    const toolInput = { query: 'review' };
    const toolRequest: ModelToolRequest = {
      kind: 'tool-request',
      toolId: 'calendar.lookup',
      input: toolInput,
    };
    const toolResult = { toolId: 'calendar.lookup', output: { eventId: 'event-1' } };
    const turn = createToolResultModelTurn({ input, toolRequest, toolResult });
    const executionRequest = createModelExecutionRequest({ model, turn });
    const normalizedRequest = createCanonicalRequest();
    const adapterResponse = createCanonicalResponse();
    const requestNormalizer: ModelRequestNormalizer = vi.fn(() => normalizedRequest);
    const providerAdapter: ModelProviderAdapter = {
      execute: vi.fn(async () => adapterResponse),
    };
    const executor = createModelProviderExecutionExecutor({
      requestNormalizer,
      providerAdapter,
    });

    const result = await executor(executionRequest);

    expect(requestNormalizer).toHaveBeenCalledOnce();
    expect(requestNormalizer).toHaveBeenCalledWith(turn);
    expect(vi.mocked(requestNormalizer).mock.calls[0]?.[0]).toBe(turn);
    expect(providerAdapter.execute).toHaveBeenCalledOnce();
    expect(vi.mocked(providerAdapter.execute).mock.calls[0]?.[0].model).toBe(model);
    expect(vi.mocked(providerAdapter.execute).mock.calls[0]?.[0].request).toBe(normalizedRequest);
    expect(result.output).toBe(adapterResponse);
    expect(turn.input).toBe(input);
    expect(turn.toolRequest).toBe(toolRequest);
    expect(turn.toolResult).toBe(toolResult);
  });

  it('passes a canonical Tool-request response through without interpreting or executing it', async () => {
    const model = createRegisteredModel();
    const turn = createInitialModelTurn({ prompt: 'Find the event.' });
    const executionRequest = createModelExecutionRequest({ model, turn });
    const normalizedRequest = createCanonicalRequest();
    const toolInput = { query: 'review' };
    const adapterResponse = createModelResponse({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [{ toolId: 'calendar.lookup', input: toolInput }],
      finishReason: 'tool-request',
    });
    const exactToolRequests = adapterResponse.toolRequests;
    const exactToolRequest = adapterResponse.toolRequests[0];
    const requestNormalizer: ModelRequestNormalizer = vi.fn(() => normalizedRequest);
    const providerAdapter: ModelProviderAdapter = {
      execute: vi.fn(async () => adapterResponse),
    };
    const executor = createModelProviderExecutionExecutor({
      requestNormalizer,
      providerAdapter,
    });

    const result = await executor(executionRequest);
    const output = result.output as ModelResponse;

    expect(requestNormalizer).toHaveBeenCalledOnce();
    expect(providerAdapter.execute).toHaveBeenCalledOnce();
    expect(result.output).toBe(adapterResponse);
    expect(output.finishReason).toBe('tool-request');
    expect(output.toolRequests).toBe(exactToolRequests);
    expect(output.toolRequests[0]).toBe(exactToolRequest);
    expect(output.toolRequests[0]?.toolId).toBe('calendar.lookup');
    expect(output.toolRequests[0]?.input).toBe(toolInput);
  });

  it('propagates a normalizer failure unchanged without invoking the Provider Adapter', async () => {
    const failure = new Error('Request normalization failed');
    const executionRequest = createModelExecutionRequest({
      model: createRegisteredModel(),
      turn: createInitialModelTurn({ prompt: 'Find the event.' }),
    });
    const requestNormalizer: ModelRequestNormalizer = vi.fn(() => {
      throw failure;
    });
    const providerAdapter: ModelProviderAdapter = {
      execute: vi.fn(async () => createCanonicalResponse()),
    };
    const executor = createModelProviderExecutionExecutor({
      requestNormalizer,
      providerAdapter,
    });

    await expect(executor(executionRequest)).rejects.toBe(failure);
    expect(requestNormalizer).toHaveBeenCalledOnce();
    expect(providerAdapter.execute).not.toHaveBeenCalled();
  });

  it.each(['synchronous failure', 'asynchronous rejection'] as const)(
    'propagates an adapter %s unchanged without retry',
    async (failureKind) => {
      const failure = new Error(`Provider Adapter ${failureKind}`);
      const executionRequest = createModelExecutionRequest({
        model: createRegisteredModel(),
        turn: createInitialModelTurn({ prompt: 'Find the event.' }),
      });
      const normalizedRequest = createCanonicalRequest();
      const requestNormalizer: ModelRequestNormalizer = vi.fn(() => normalizedRequest);
      const execute =
        failureKind === 'synchronous failure'
          ? vi.fn(() => {
              throw failure;
            })
          : vi.fn(async () => {
              throw failure;
            });
      const providerAdapter: ModelProviderAdapter = { execute };
      const executor = createModelProviderExecutionExecutor({
        requestNormalizer,
        providerAdapter,
      });

      await expect(executor(executionRequest)).rejects.toBe(failure);
      expect(requestNormalizer).toHaveBeenCalledOnce();
      expect(providerAdapter.execute).toHaveBeenCalledOnce();
    },
  );

  it('does not mutate, clone, or freeze caller-owned nested inputs', async () => {
    const model = defineModel({
      id: 'general',
      provider: 'test-provider',
      providerModelId: 'provider/general:v1',
    });
    const nestedInput = { eventId: 'event-1' };
    const input = { prompt: 'Find the event.', nested: nestedInput };
    const turn = { kind: 'initial' as const, input };
    const executionRequest = createModelExecutionRequest({ model, turn });
    const normalizedRequest = createCanonicalRequest();
    const adapterResponse = createCanonicalResponse();
    const modelBefore = { ...model };
    const turnBefore = { ...turn };
    const inputBefore = { ...input };
    const requestNormalizer: ModelRequestNormalizer = vi.fn(() => normalizedRequest);
    const providerAdapter: ModelProviderAdapter = {
      execute: vi.fn(async () => adapterResponse),
    };
    const executor = createModelProviderExecutionExecutor({
      requestNormalizer,
      providerAdapter,
    });

    const result = await executor(executionRequest);

    expect(executionRequest.model).toBe(model);
    expect(executionRequest.turn).toBe(turn);
    expect(vi.mocked(requestNormalizer).mock.calls[0]?.[0]).toBe(turn);
    expect(vi.mocked(providerAdapter.execute).mock.calls[0]?.[0].request).toBe(normalizedRequest);
    expect(result.output).toBe(adapterResponse);
    expect(model).toEqual(modelBefore);
    expect(turn).toEqual(turnBefore);
    expect(input).toEqual(inputBefore);
    expect(input.nested).toBe(nestedInput);
    expect(Object.isFrozen(model)).toBe(false);
    expect(Object.isFrozen(turn)).toBe(false);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(nestedInput)).toBe(false);
  });
});
