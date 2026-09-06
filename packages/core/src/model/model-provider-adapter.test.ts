import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createModelRegistry,
  createModelRequest,
  createModelResponse,
  defineModel,
  type ModelProviderAdapter as CoreModelProviderAdapter,
  type ModelProviderAdapterRequest as CoreModelProviderAdapterRequest,
} from '../index.js';
import type { ModelProviderAdapter, ModelProviderAdapterRequest } from './index.js';

describe('Model Provider Adapter', () => {
  it('exposes the provider-independent contract through the Model and Core public APIs', () => {
    expectTypeOf<CoreModelProviderAdapter>().toEqualTypeOf<ModelProviderAdapter>();
    expectTypeOf<CoreModelProviderAdapterRequest>().toEqualTypeOf<ModelProviderAdapterRequest>();
    expectTypeOf<keyof ModelProviderAdapterRequest>().toEqualTypeOf<'model' | 'request'>();
  });

  it('passes exact canonical inputs across an asynchronous adapter boundary', async () => {
    const modelRegistry = createModelRegistry();
    const model = modelRegistry.register(
      defineModel({
        id: 'general',
        provider: 'test-provider',
        providerModelId: 'provider/general:v1',
      }),
    );
    const content = { parts: [{ text: 'Find the event.' }] };
    const request = createModelRequest({
      instructions: ['Answer the request.'],
      input: [{ kind: 'message', role: 'user', content }],
      tools: [],
    });
    const responseContent = { parts: [{ text: 'Event found.' }] };
    const response = createModelResponse({
      content: responseContent,
      structuredOutput: undefined,
      toolRequests: [],
      finishReason: 'stop',
    });
    let received: ModelProviderAdapterRequest | undefined;
    const adapter: ModelProviderAdapter = {
      async execute(adapterRequest) {
        received = adapterRequest;
        return response;
      },
    };
    const adapterRequest: ModelProviderAdapterRequest = { model, request };

    const execution = adapter.execute(adapterRequest);

    expect(execution).toBeInstanceOf(Promise);
    await expect(execution).resolves.toBe(response);
    expect(received).toBe(adapterRequest);
    expect(received?.model).toBe(model);
    expect(received?.request).toBe(request);
    const receivedInput = received?.request.input[0];
    expect(receivedInput?.kind).toBe('message');
    if (receivedInput?.kind !== 'message') {
      throw new Error('Expected canonical message input');
    }
    expect(receivedInput.content).toBe(content);
    expect(response.content).toBe(responseContent);
  });

  it('does not require construction, cloning, freezing, or mutation of caller-owned values', async () => {
    const model = defineModel({
      id: 'general',
      provider: 'test-provider',
      providerModelId: 'provider/general:v1',
    });
    const nestedContent = { text: 'Original.' };
    const content = { nested: nestedContent };
    const request = createModelRequest({
      instructions: [],
      input: [{ kind: 'message', role: 'user', content }],
      tools: [],
    });
    const response = createModelResponse({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [],
      finishReason: 'stop',
    });
    const adapterRequest: ModelProviderAdapterRequest = { model, request };
    const adapterRequestBefore = { ...adapterRequest };
    const modelBefore = { ...model };
    const adapter: ModelProviderAdapter = {
      async execute(received) {
        expect(received).toBe(adapterRequest);
        return response;
      },
    };

    await expect(adapter.execute(adapterRequest)).resolves.toBe(response);

    expect(adapterRequest).toEqual(adapterRequestBefore);
    expect(model).toEqual(modelBefore);
    expect(adapterRequest.model).toBe(model);
    expect(adapterRequest.request).toBe(request);
    expect(Object.isFrozen(adapterRequest)).toBe(false);
    expect(Object.isFrozen(model)).toBe(false);
    expect(Object.isFrozen(content)).toBe(false);
    expect(Object.isFrozen(nestedContent)).toBe(false);
  });
});
