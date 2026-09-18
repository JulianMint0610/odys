import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createModelResponse,
  interpretModelResponse,
  ModelOutcomeValidationError,
  ModelResponseInterpretationError,
  type ModelOutcome,
  type ModelResponse,
} from '../index.js';

function response(overrides: Partial<ModelResponse> = {}): ModelResponse {
  return {
    content: undefined,
    structuredOutput: undefined,
    toolRequests: [],
    finishReason: 'stop',
    ...overrides,
  };
}

function captureInterpretationError(value: ModelResponse): ModelResponseInterpretationError {
  try {
    interpretModelResponse(value);
  } catch (error) {
    if (error instanceof ModelResponseInterpretationError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected ModelResponseInterpretationError');
}

describe('Model Response interpretation', () => {
  it('exposes the standalone provider-independent contract through Core', () => {
    expectTypeOf(interpretModelResponse).toEqualTypeOf<(response: ModelResponse) => ModelOutcome>();
  });

  it('maps stop to a canonical final outcome with the exact response reference', () => {
    const content = { text: 'caller-owned content' };
    const structuredOutput = { result: ['caller-owned output'] };
    const source = createModelResponse(response({ content, structuredOutput }));

    const outcome = interpretModelResponse(source);

    expect(outcome).toEqual({ kind: 'final', output: source });
    expect(outcome.kind).toBe('final');
    if (outcome.kind !== 'final') throw new Error('Expected final outcome');
    expect(outcome.output).toBe(source);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(source).toEqual({
      content: { text: 'caller-owned content' },
      structuredOutput: { result: ['caller-owned output'] },
      toolRequests: [],
      finishReason: 'stop',
    });
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(content)).toBe(false);
    expect(Object.isFrozen(structuredOutput)).toBe(false);
    expect(Object.isFrozen(structuredOutput.result)).toBe(false);
  });

  it('maps one Tool request without Registry, Agent, Tool Runtime, or Provider execution', () => {
    const input = { query: ['caller-owned input'] };
    const toolRequest = { toolId: 'unregistered.lookup', input };
    const source = createModelResponse(
      response({
        content: { text: 'content alongside the Tool request' },
        toolRequests: [toolRequest],
        finishReason: 'tool-request',
      }),
    );

    const outcome = interpretModelResponse(source);

    expect(outcome).toEqual({
      kind: 'tool-request',
      toolId: 'unregistered.lookup',
      input,
    });
    expect(outcome.kind).toBe('tool-request');
    if (outcome.kind !== 'tool-request') throw new Error('Expected Tool-request outcome');
    expect(outcome.toolId).toBe(toolRequest.toolId);
    expect(outcome.input).toBe(input);
    expect(outcome).not.toBe(source.toolRequests[0]);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(source).toEqual({
      content: { text: 'content alongside the Tool request' },
      structuredOutput: undefined,
      toolRequests: [{ toolId: 'unregistered.lookup', input: { query: ['caller-owned input'] } }],
      finishReason: 'tool-request',
    });
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(toolRequest)).toBe(false);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.query)).toBe(false);
  });

  it('fails closed for multiple Tool requests without exposing content or Tool input', () => {
    const source = createModelResponse(
      response({
        content: 'secret-content-sentinel',
        toolRequests: [
          { toolId: 'unregistered.first', input: 'secret-input-sentinel' },
          { toolId: 'unregistered.second', input: null },
        ],
        finishReason: 'tool-request',
      }),
    );

    const error = captureInterpretationError(source);

    expect(error.name).toBe('ModelResponseInterpretationError');
    expect(error.message).toContain('2 Tool requests');
    expect(`${error.name}: ${error.message}`).not.toContain('secret-content-sentinel');
    expect(`${error.name}: ${error.message}`).not.toContain('secret-input-sentinel');
  });

  it.each(['length', 'other'] as const)(
    'fails closed for %s even with populated content and structured output',
    (finishReason) => {
      const source = createModelResponse(
        response({
          content: 'secret-content-sentinel',
          structuredOutput: { value: 'secret-structured-sentinel' },
          finishReason,
        }),
      );

      const error = captureInterpretationError(source);

      expect(error.name).toBe('ModelResponseInterpretationError');
      expect(error.message).toContain(finishReason);
      expect(`${error.name}: ${error.message}`).not.toContain('secret-content-sentinel');
      expect(`${error.name}: ${error.message}`).not.toContain('secret-structured-sentinel');
    },
  );

  it('lets canonical outcome validation errors propagate unchanged', () => {
    const source = response({
      toolRequests: [{ toolId: 'invalid tool id', input: null }],
      finishReason: 'tool-request',
    });

    expect(() => interpretModelResponse(source)).toThrow(ModelOutcomeValidationError);
  });
});
