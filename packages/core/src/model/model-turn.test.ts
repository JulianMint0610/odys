import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createInitialModelTurn,
  createToolResultModelTurn,
  type ModelToolRequest,
  type ModelTurn,
} from '../index.js';

describe('Model Turn', () => {
  it('creates distinct frozen initial turns without taking ownership of opaque input', () => {
    const nested = { value: 1 };
    const input = { prompt: 'Find the event.', nested };
    const inputBefore = { ...input };

    const first = createInitialModelTurn(input);
    const second = createInitialModelTurn(input);

    expect(first).toEqual({ kind: 'initial', input });
    expect(first.kind).toBe('initial');
    expect(first.input).toBe(input);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(nested)).toBe(false);
    expect(input).toEqual(inputBefore);
    expect(input.nested).toBe(nested);
    expectTypeOf(first).toMatchTypeOf<ModelTurn>();
  });

  it('creates a frozen Tool-result turn preserving all exact caller-owned references', () => {
    const nestedInput = { value: 1 };
    const input = { prompt: 'Find the event.', nested: nestedInput };
    const toolInput = { query: 'review' };
    const toolRequest: ModelToolRequest = {
      kind: 'tool-request',
      toolId: 'calendar.lookup',
      input: toolInput,
    };
    const nestedOutput = { eventId: 'event-1' };
    const toolResult = { toolId: 'calendar.lookup', output: nestedOutput };
    const inputBefore = { ...input };
    const toolRequestBefore = { ...toolRequest };
    const toolResultBefore = { ...toolResult };

    const turn = createToolResultModelTurn({ input, toolRequest, toolResult });
    const second = createToolResultModelTurn({ input, toolRequest, toolResult });

    expect(turn).toEqual({ kind: 'tool-result', input, toolRequest, toolResult });
    expect(turn.kind).toBe('tool-result');
    expect(turn.input).toBe(input);
    expect(turn.toolRequest).toBe(toolRequest);
    expect(turn.toolResult).toBe(toolResult);
    expect(turn).not.toBe(second);
    expect(Object.isFrozen(turn)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(nestedInput)).toBe(false);
    expect(Object.isFrozen(toolRequest)).toBe(false);
    expect(Object.isFrozen(toolInput)).toBe(false);
    expect(Object.isFrozen(toolResult)).toBe(false);
    expect(Object.isFrozen(nestedOutput)).toBe(false);
    expect(input).toEqual(inputBefore);
    expect(toolRequest).toEqual(toolRequestBefore);
    expect(toolResult).toEqual(toolResultBefore);
    expectTypeOf(turn).toMatchTypeOf<ModelTurn>();
  });
});
