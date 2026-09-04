import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createModelResponse,
  InvalidModelResponseError,
  type ModelFinishReason,
  type ModelResponse,
  type ModelResponseToolRequest,
} from '../index.js';

function runtimeResponse(value: unknown): ModelResponse {
  return value as ModelResponse;
}

function stopResponse(overrides: Record<string, unknown> = {}): ModelResponse {
  return {
    content: undefined,
    structuredOutput: undefined,
    toolRequests: [],
    finishReason: 'stop',
    ...overrides,
  } as ModelResponse;
}

describe('Model Response', () => {
  it('exposes the provider-independent public contract through Core', () => {
    const finishReason: ModelFinishReason = 'stop';
    const toolRequest: ModelResponseToolRequest = { toolId: 'calendar.lookup', input: null };
    const response: ModelResponse = createModelResponse({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [],
      finishReason,
    });

    expect(response).toEqual({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [],
      finishReason: 'stop',
    });
    expect(toolRequest).toEqual({ toolId: 'calendar.lookup', input: null });
    expectTypeOf(response).toMatchTypeOf<ModelResponse>();
  });

  it('preserves generated content and structured output as opaque exact references', () => {
    const content = { parts: [{ type: 'text', value: 'completed' }] };
    const structuredOutput = { result: { status: 'ready' } };

    const response = createModelResponse({
      content,
      structuredOutput,
      toolRequests: [],
      finishReason: 'stop',
    });

    expect(response.content).toBe(content);
    expect(response.structuredOutput).toBe(structuredOutput);
  });

  it.each(['length', 'other'] as const)('accepts the %s finish reason', (finishReason) => {
    expect(createModelResponse({ ...stopResponse(), finishReason })).toEqual({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [],
      finishReason,
    });
  });

  it('accepts one canonical Tool request without resolving Registry membership', () => {
    const input = { query: 'example' };

    expect(
      createModelResponse({
        content: undefined,
        structuredOutput: undefined,
        toolRequests: [{ toolId: 'future.search', input }],
        finishReason: 'tool-request',
      }),
    ).toEqual({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [{ toolId: 'future.search', input }],
      finishReason: 'tool-request',
    });
  });

  it('accepts multiple Tool requests and preserves their order', () => {
    const response = createModelResponse({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [
        { toolId: 'calendar.lookup', input: { eventId: 'event-1' } },
        { toolId: 'mail.send', input: { messageId: 'message-1' } },
      ],
      finishReason: 'tool-request',
    });

    expect(response.toolRequests.map(({ toolId }) => toolId)).toEqual([
      'calendar.lookup',
      'mail.send',
    ]);
  });

  it.each([
    { finishReason: 'tool-request', toolRequests: [] },
    { finishReason: 'stop', toolRequests: [{ toolId: 'calendar.lookup', input: null }] },
    { finishReason: 'length', toolRequests: [{ toolId: 'calendar.lookup', input: null }] },
    { finishReason: 'other', toolRequests: [{ toolId: 'calendar.lookup', input: null }] },
  ])(
    'rejects inconsistent $finishReason and Tool-request count',
    ({ finishReason, toolRequests }) => {
      expect(() => createModelResponse(stopResponse({ finishReason, toolRequests }))).toThrow(
        InvalidModelResponseError,
      );
    },
  );

  it.each([
    '',
    'Calendar.lookup',
    'calendar.*',
    'calendar/lookup',
    '.calendar.lookup',
    'calendar..lookup',
    'calendar.lookup.',
    ' calendar.lookup',
    'calendar.lookup ',
  ])('rejects the non-canonical Tool ID %j without normalization', (toolId) => {
    expect(() =>
      createModelResponse(
        stopResponse({
          toolRequests: [{ toolId, input: null }],
          finishReason: 'tool-request',
        }),
      ),
    ).toThrow('Invalid Model response: toolRequests[0].toolId must be a canonical Tool identifier');
  });
  it('rejects sparse Tool request arrays', () => {
    const toolRequests = new Array(2);

    expect(() =>
      createModelResponse(
        stopResponse({
          toolRequests,
          finishReason: 'tool-request',
        }),
      ),
    ).toThrow('Invalid Model response: toolRequests[0] must be an object');
  });

  it.each([null, undefined, 1, 'response', [], () => undefined])(
    'rejects the non-object response options %j',
    (options) => {
      expect(() => createModelResponse(runtimeResponse(options))).toThrow(
        InvalidModelResponseError,
      );
      expect(() => createModelResponse(runtimeResponse(options))).toThrow(
        'Invalid Model response: options must be an object',
      );
    },
  );

  it.each([
    ['content', { structuredOutput: undefined, toolRequests: [], finishReason: 'stop' }],
    ['structuredOutput', { content: undefined, toolRequests: [], finishReason: 'stop' }],
    ['toolRequests', { content: undefined, structuredOutput: undefined, finishReason: 'stop' }],
    ['finishReason', { content: undefined, structuredOutput: undefined, toolRequests: [] }],
  ])('requires %s to be an own property', (field, options) => {
    const inherited = Object.assign(Object.create({ [field]: undefined }), options);

    expect(() => createModelResponse(runtimeResponse(options))).toThrow(
      `Invalid Model response: ${field} must be provided`,
    );
    expect(() => createModelResponse(runtimeResponse(inherited))).toThrow(
      `Invalid Model response: ${field} must be provided`,
    );
  });

  it('requires toolRequests to be an array', () => {
    expect(() => createModelResponse(stopResponse({ toolRequests: {} }))).toThrow(
      'Invalid Model response: toolRequests must be an array',
    );
  });

  it.each([null, [], 'request', 1])('rejects malformed Tool request %j', (toolRequest) => {
    expect(() =>
      createModelResponse(
        stopResponse({ toolRequests: [toolRequest], finishReason: 'tool-request' }),
      ),
    ).toThrow('Invalid Model response: toolRequests[0] must be an object');
  });

  it('requires Tool-request fields to be own properties while accepting undefined input', () => {
    const inheritedToolId = Object.assign(Object.create({ toolId: 'calendar.lookup' }), {
      input: null,
    });
    const inheritedInput = Object.assign(Object.create({ input: null }), {
      toolId: 'calendar.lookup',
    });

    expect(() =>
      createModelResponse(
        stopResponse({ toolRequests: [inheritedToolId], finishReason: 'tool-request' }),
      ),
    ).toThrow('Invalid Model response: toolRequests[0].toolId must be provided');
    expect(() =>
      createModelResponse(
        stopResponse({ toolRequests: [inheritedInput], finishReason: 'tool-request' }),
      ),
    ).toThrow('Invalid Model response: toolRequests[0].input must be provided');
    expect(
      createModelResponse(
        stopResponse({
          toolRequests: [{ toolId: 'calendar.lookup', input: undefined }],
          finishReason: 'tool-request',
        }),
      ).toolRequests[0]?.input,
    ).toBeUndefined();
  });

  it.each(['Stop', 'tool_request', 'length-limit', '', null, undefined])(
    'rejects the unsupported finish reason %j',
    (finishReason) => {
      expect(() => createModelResponse(stopResponse({ finishReason }))).toThrow(
        'Invalid Model response: finishReason must be "stop", "tool-request", "length", or "other"',
      );
    },
  );

  it('owns and freezes canonical wrappers without freezing caller-owned wrappers', () => {
    const input = { nested: { value: 1 } };
    const sourceToolRequest = { toolId: 'calendar.lookup', input };
    const sourceToolRequests: Array<{ toolId: string; input: unknown }> = [sourceToolRequest];
    const options = {
      content: undefined,
      structuredOutput: undefined,
      toolRequests: sourceToolRequests,
      finishReason: 'tool-request' as const,
    };

    const response = createModelResponse(options);

    expect(response).not.toBe(options);
    expect(response.toolRequests).not.toBe(sourceToolRequests);
    expect(response.toolRequests[0]).not.toBe(sourceToolRequest);
    expect(Object.isFrozen(response)).toBe(true);
    expect(Object.isFrozen(response.toolRequests)).toBe(true);
    expect(Object.isFrozen(response.toolRequests[0])).toBe(true);
    expect(Object.isFrozen(options)).toBe(false);
    expect(Object.isFrozen(sourceToolRequests)).toBe(false);
    expect(Object.isFrozen(sourceToolRequest)).toBe(false);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.nested)).toBe(false);
  });

  it('snapshots Tool wrappers while preserving mutable nested reference identity', () => {
    const content = { value: 'content' };
    const structuredOutput = { value: 'structured' };
    const input = { value: 'input' };
    const sourceToolRequest = { toolId: 'calendar.lookup', input };
    const sourceToolRequests: Array<{ toolId: string; input: unknown }> = [sourceToolRequest];

    const response = createModelResponse({
      content,
      structuredOutput,
      toolRequests: sourceToolRequests,
      finishReason: 'tool-request',
    });

    sourceToolRequests.push({ toolId: 'mail.send', input: null });
    sourceToolRequest.toolId = 'calendar.changed';
    input.value = 'changed';
    content.value = 'changed';
    structuredOutput.value = 'changed';

    expect(response.toolRequests).toHaveLength(1);
    expect(response.toolRequests[0]?.toolId).toBe('calendar.lookup');
    expect(response.toolRequests[0]?.input).toBe(input);
    expect(response.content).toBe(content);
    expect(response.structuredOutput).toBe(structuredOutput);
    expect((response.toolRequests[0]?.input as typeof input).value).toBe('changed');
  });

  it('strips arbitrary extra fields from response and Tool-request wrappers', () => {
    const response = createModelResponse(
      runtimeResponse({
        content: undefined,
        structuredOutput: undefined,
        toolRequests: [
          { toolId: 'calendar.lookup', input: null, providerCallId: 'call-1', approved: true },
        ],
        finishReason: 'tool-request',
        provider: 'example-provider',
        usage: { tokens: 1 },
        authorized: true,
      }),
    );

    expect(Object.keys(response)).toEqual([
      'content',
      'structuredOutput',
      'toolRequests',
      'finishReason',
    ]);
    expect(Object.keys(response.toolRequests[0] ?? {})).toEqual(['toolId', 'input']);
    expect(response).not.toHaveProperty('provider');
    expect(response.toolRequests[0]).not.toHaveProperty('approved');
  });
});
