import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createInitialModelTurn,
  createModelExecutionRequest,
  createModelExecutionResult,
  createModelRegistry,
  defineModel,
  type ModelExecutionRequest,
  type ModelExecutionResult,
  type ModelTurn,
} from '../index.js';

describe('Model Execution', () => {
  it('creates distinct frozen requests preserving the exact resolved Model and Model Turn', () => {
    const modelRegistry = createModelRegistry();
    const model = modelRegistry.register(
      defineModel({
        id: 'general',
        provider: 'test-provider',
        providerModelId: 'provider/general:v1',
      }),
    );
    const nestedInput = { eventId: 'event-1' };
    const input = { prompt: 'Find the event.', nested: nestedInput };
    const turn = createInitialModelTurn(input);
    const options = { model, turn };

    const first = createModelExecutionRequest(options);
    const second = createModelExecutionRequest(options);

    expect(first).toEqual({ model, turn });
    expect(first.model).toBe(model);
    expect(first.turn).toBe(turn);
    expect(first.turn.input).toBe(input);
    expect((first.turn.input as typeof input).nested).toBe(nestedInput);
    expect(first).not.toBe(options);
    expect(second).not.toBe(options);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(Object.isFrozen(options)).toBe(false);
    expectTypeOf(first).toMatchTypeOf<ModelExecutionRequest>();
  });

  it('does not clone, freeze, normalize, or mutate supplied request values', () => {
    const model = defineModel({
      id: 'general',
      provider: 'test-provider',
      providerModelId: 'provider/general:v1',
    });
    const nestedInput = { eventId: 'event-1' };
    const input = { prompt: 'Find the event.', nested: nestedInput };
    const turn: ModelTurn = { kind: 'initial', input };
    const modelBefore = { ...model };
    const turnBefore = { ...turn };

    const request = createModelExecutionRequest({ model, turn });

    expect(request.model).toBe(model);
    expect(request.turn).toBe(turn);
    expect(Object.isFrozen(model)).toBe(false);
    expect(Object.isFrozen(turn)).toBe(false);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(nestedInput)).toBe(false);
    expect(model).toEqual(modelBefore);
    expect(turn).toEqual(turnBefore);
    expect(turn.input).toBe(input);
    expect(input.nested).toBe(nestedInput);
  });

  it('creates distinct frozen results preserving opaque untrusted output', () => {
    const nestedOutput = { content: 'not parsed' };
    const output = { kind: 'provider-specific', nested: nestedOutput };
    const outputBefore = { ...output };

    const first = createModelExecutionResult(output);
    const second = createModelExecutionResult(output);

    expect(first).toEqual({ output });
    expect(first.output).toBe(output);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(Object.isFrozen(output)).toBe(false);
    expect(Object.isFrozen(nestedOutput)).toBe(false);
    expect(output).toEqual(outputBefore);
    expect(output.nested).toBe(nestedOutput);
    expectTypeOf(first).toMatchTypeOf<ModelExecutionResult>();
  });
});
