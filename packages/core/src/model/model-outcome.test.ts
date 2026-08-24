import { describe, expect, expectTypeOf, it } from 'vitest';

import { ModelOutcomeValidationError, parseModelOutcome, type ModelOutcome } from '../index.js';

function captureError(value: unknown): ModelOutcomeValidationError {
  try {
    parseModelOutcome(value);
  } catch (error) {
    expect(error).toBeInstanceOf(ModelOutcomeValidationError);
    return error as ModelOutcomeValidationError;
  }

  throw new Error('Expected Model outcome validation to fail');
}

describe('parseModelOutcome', () => {
  it('exposes the staged Model outcome contract through the Core public API', () => {
    const outcome: ModelOutcome = parseModelOutcome({ kind: 'final', output: 'completed' });

    expect(outcome).toEqual({ kind: 'final', output: 'completed' });
    expectTypeOf(outcome).toEqualTypeOf<ModelOutcome>();
    expect(new ModelOutcomeValidationError('invalid')).toBeInstanceOf(Error);
  });

  it.each([
    { label: 'a string', output: 'completed' },
    { label: 'null', output: null },
    { label: 'explicit undefined', output: undefined },
  ])('accepts $label as opaque final output', ({ output }) => {
    const outcome = parseModelOutcome({ kind: 'final', output });

    expect(outcome).toEqual({ kind: 'final', output });
    expect(outcome.kind).toBe('final');
    if (outcome.kind === 'final') {
      expect(outcome.output).toBe(output);
    }
  });

  it('accepts an object as opaque final output', () => {
    const output = { content: 'completed' };
    const outcome = parseModelOutcome({ kind: 'final', output });

    expect(outcome).toEqual({ kind: 'final', output });
    expect(outcome.kind).toBe('final');
    if (outcome.kind === 'final') {
      expect(outcome.output).toBe(output);
    }
  });

  it('accepts a null-prototype outcome object', () => {
    const raw = Object.assign(Object.create(null) as Record<string, unknown>, {
      kind: 'final',
      output: 'completed',
    });

    expect(parseModelOutcome(raw)).toEqual({ kind: 'final', output: 'completed' });
  });

  it('returns a frozen canonical final outcome without taking nested ownership', () => {
    const output = { content: 'completed' };
    const raw = { kind: 'final', output };
    const outcome = parseModelOutcome(raw);

    expect(outcome).not.toBe(raw);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(outcome.kind).toBe('final');
    if (outcome.kind === 'final') {
      expect(outcome.output).toBe(output);
    }
    expect(Object.isFrozen(output)).toBe(false);
    expect(raw).toEqual({ kind: 'final', output });
  });

  it('returns distinct final outcome containers while preserving the same nested reference', () => {
    const output = { content: 'completed' };
    const raw = { kind: 'final', output };

    const first = parseModelOutcome(raw);
    const second = parseModelOutcome(raw);

    expect(first).not.toBe(raw);
    expect(second).not.toBe(raw);
    expect(first).not.toBe(second);
    expect(first.kind).toBe('final');
    expect(second.kind).toBe('final');
    if (first.kind === 'final' && second.kind === 'final') {
      expect(first.output).toBe(output);
      expect(second.output).toBe(output);
    }
  });

  it('accepts a canonical Tool request without resolving Registry membership', () => {
    const input = { query: 'example' };

    expect(parseModelOutcome({ kind: 'tool-request', toolId: 'calendar.write', input })).toEqual({
      kind: 'tool-request',
      toolId: 'calendar.write',
      input,
    });
    expect(
      parseModelOutcome({ kind: 'tool-request', toolId: 'future.search', input: null }),
    ).toEqual({ kind: 'tool-request', toolId: 'future.search', input: null });
  });

  it.each([
    { label: 'a string', input: 'query' },
    { label: 'a number', input: 1 },
    { label: 'a boolean', input: true },
    { label: 'null', input: null },
    { label: 'explicit undefined', input: undefined },
  ])('accepts $label as opaque Tool input', ({ input }) => {
    const outcome = parseModelOutcome({
      kind: 'tool-request',
      toolId: 'calendar.write',
      input,
    });

    expect(outcome).toEqual({ kind: 'tool-request', toolId: 'calendar.write', input });
    if (outcome.kind === 'tool-request') {
      expect(outcome.input).toBe(input);
    }
  });

  it('accepts an object as opaque Tool input and preserves exact reference identity', () => {
    const input = { query: 'example' };
    const raw = { kind: 'tool-request', toolId: 'web.search', input };
    const outcome = parseModelOutcome(raw);

    expect(outcome).not.toBe(raw);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(input)).toBe(false);
    expect(outcome.kind).toBe('tool-request');
    if (outcome.kind === 'tool-request') {
      expect(outcome.input).toBe(input);
    }
    expect(raw).toEqual({ kind: 'tool-request', toolId: 'web.search', input });
  });

  it('returns distinct Tool request containers while preserving the same nested reference', () => {
    const input = { query: 'example' };
    const raw = { kind: 'tool-request', toolId: 'web.search', input };

    const first = parseModelOutcome(raw);
    const second = parseModelOutcome(raw);

    expect(first).not.toBe(raw);
    expect(second).not.toBe(raw);
    expect(first).not.toBe(second);
    expect(first.kind).toBe('tool-request');
    expect(second.kind).toBe('tool-request');
    if (first.kind === 'tool-request' && second.kind === 'tool-request') {
      expect(first.input).toBe(input);
      expect(second.input).toBe(input);
    }
  });

  it.each([
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'an array', value: [] },
    { label: 'a string', value: 'outcome' },
    { label: 'a number', value: 1 },
    { label: 'a boolean', value: true },
    { label: 'a bigint', value: 1n },
    { label: 'a symbol', value: Symbol('outcome') },
    { label: 'a function', value: () => undefined },
  ])('rejects $label as a Model outcome root', ({ value }) => {
    expect(() => parseModelOutcome(value)).toThrow(ModelOutcomeValidationError);
    expect(() => parseModelOutcome(value)).toThrow(
      'Invalid Model outcome: outcome must be an object',
    );
  });

  it('requires kind to be an own property', () => {
    const inheritedKind = Object.assign(Object.create({ kind: 'final' }), {
      output: 'completed',
    });

    expect(() => parseModelOutcome({})).toThrow('Invalid Model outcome: kind must be provided');
    expect(() => parseModelOutcome(inheritedKind)).toThrow(
      'Invalid Model outcome: kind must be provided',
    );
  });

  it.each([
    { label: 'undefined', kind: undefined },
    { label: 'null', kind: null },
    { label: 'a number', kind: 1 },
    { label: 'an object', kind: {} },
  ])('rejects an own $label kind as unsupported rather than missing', ({ kind }) => {
    expect(() => parseModelOutcome({ kind })).toThrow(
      'Invalid Model outcome: kind must be "final" or "tool-request"',
    );
  });

  it.each([
    'Final',
    'FINAL',
    'tool_request',
    'toolRequest',
    ' final',
    'final ',
    ' tool-request',
    'tool-request ',
    'unknown',
  ])('rejects the non-canonical kind %j without normalization', (kind) => {
    expect(() => parseModelOutcome({ kind })).toThrow(
      'Invalid Model outcome: kind must be "final" or "tool-request"',
    );
  });

  it('requires final output to be an own property while accepting explicit undefined', () => {
    const inheritedOutput = Object.assign(Object.create({ output: 'inherited' }), {
      kind: 'final',
    });

    expect(() => parseModelOutcome({ kind: 'final' })).toThrow(
      'Invalid Model outcome: output must be provided for a final outcome',
    );
    expect(() => parseModelOutcome(inheritedOutput)).toThrow(
      'Invalid Model outcome: output must be provided for a final outcome',
    );
    expect(parseModelOutcome({ kind: 'final', output: undefined })).toEqual({
      kind: 'final',
      output: undefined,
    });
  });

  it('requires Tool ID to be an own property', () => {
    const inheritedToolId = Object.assign(Object.create({ toolId: 'calendar.write' }), {
      kind: 'tool-request',
      input: null,
    });

    expect(() => parseModelOutcome({ kind: 'tool-request', input: null })).toThrow(
      'Invalid Model outcome: toolId must be provided for a tool-request outcome',
    );
    expect(() => parseModelOutcome(inheritedToolId)).toThrow(
      'Invalid Model outcome: toolId must be provided for a tool-request outcome',
    );
  });

  it.each([
    '',
    'Calendar.write',
    'calendar.*',
    'calendar/write',
    '.calendar.write',
    'calendar..write',
    'calendar.write.',
    ' calendar.write',
    'calendar.write ',
  ])('rejects the non-canonical Tool ID %j without normalization', (toolId) => {
    expect(() => parseModelOutcome({ kind: 'tool-request', toolId, input: null })).toThrow(
      'Invalid Model outcome: toolId must be a canonical Tool identifier',
    );
  });

  it('requires Tool input to be an own property while accepting explicit undefined', () => {
    const inheritedInput = Object.assign(Object.create({ input: 'inherited' }), {
      kind: 'tool-request',
      toolId: 'calendar.write',
    });

    expect(() => parseModelOutcome({ kind: 'tool-request', toolId: 'calendar.write' })).toThrow(
      'Invalid Model outcome: input must be provided for a tool-request outcome',
    );
    expect(() => parseModelOutcome(inheritedInput)).toThrow(
      'Invalid Model outcome: input must be provided for a tool-request outcome',
    );
    expect(
      parseModelOutcome({ kind: 'tool-request', toolId: 'calendar.write', input: undefined }),
    ).toEqual({ kind: 'tool-request', toolId: 'calendar.write', input: undefined });
  });

  it('accepts harmless extra metadata but projects an exact canonical outcome', () => {
    const finalOutcome = parseModelOutcome({
      kind: 'final',
      output: 'completed',
      metadata: { provider: 'example' },
    });
    const toolOutcome = parseModelOutcome({
      kind: 'tool-request',
      toolId: 'calendar.write',
      input: {},
      metadata: { provider: 'example' },
    });

    expect(Object.keys(finalOutcome)).toEqual(['kind', 'output']);
    expect(Object.keys(toolOutcome)).toEqual(['kind', 'toolId', 'input']);
    expect(finalOutcome).not.toHaveProperty('metadata');
    expect(toolOutcome).not.toHaveProperty('metadata');
  });

  it('discards authority- and provider-looking top-level fields', () => {
    const outcome = parseModelOutcome({
      kind: 'tool-request',
      toolId: 'calendar.write',
      input: {},
      approved: true,
      approval: { id: 'approval-1' },
      permissions: ['calendar.write'],
      resolvedPermissions: ['calendar.write'],
      authorization: true,
      policy: 'allow',
      risk: 'low',
      execute: true,
      provider: 'example-provider',
      providerModelId: 'provider-model',
      modelId: 'logical-model',
    });

    expect(Object.keys(outcome)).toEqual(['kind', 'toolId', 'input']);
    expect(outcome).toEqual({ kind: 'tool-request', toolId: 'calendar.write', input: {} });
  });

  it('preserves authority-looking nested input as opaque data without interpreting it', () => {
    const input = { approved: true, nested: { value: 1 } };
    const outcome = parseModelOutcome({
      kind: 'tool-request',
      toolId: 'calendar.write',
      input,
    });

    expect(outcome.kind).toBe('tool-request');
    if (outcome.kind === 'tool-request') {
      expect(outcome.input).toBe(input);
    }
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.nested)).toBe(false);
  });

  it.each([
    {
      label: 'root validation before field validation',
      value: [],
      message: 'Invalid Model outcome: outcome must be an object',
    },
    {
      label: 'kind presence before final output presence',
      value: { output: undefined },
      message: 'Invalid Model outcome: kind must be provided',
    },
    {
      label: 'kind validity before variant fields',
      value: { kind: 'unknown' },
      message: 'Invalid Model outcome: kind must be "final" or "tool-request"',
    },
    {
      label: 'Tool ID presence before Tool input presence',
      value: { kind: 'tool-request' },
      message: 'Invalid Model outcome: toolId must be provided for a tool-request outcome',
    },
    {
      label: 'Tool ID syntax before Tool input presence',
      value: { kind: 'tool-request', toolId: 'Calendar.write' },
      message: 'Invalid Model outcome: toolId must be a canonical Tool identifier',
    },
    {
      label: 'Tool input presence after a valid Tool ID',
      value: { kind: 'tool-request', toolId: 'calendar.write' },
      message: 'Invalid Model outcome: input must be provided for a tool-request outcome',
    },
  ])('enforces $label', ({ value, message }) => {
    expect(() => parseModelOutcome(value)).toThrow(message);
  });

  it('uses a deterministic validation error without leaking raw Model values', () => {
    const privateValue = 'private-model-payload-7f9c';
    const error = captureError({
      kind: privateValue,
      output: privateValue,
      input: privateValue,
      toolId: privateValue,
    });

    expect(error).toMatchObject({
      name: 'ModelOutcomeValidationError',
      message: 'Invalid Model outcome: kind must be "final" or "tool-request"',
    });
    expect(error.name).not.toContain(privateValue);
    expect(error.message).not.toContain(privateValue);
    expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(Object.values(error)).not.toContain(privateValue);
  });

  it('does not mutate or freeze caller data when validation fails', () => {
    const output = { content: 'private' };
    const raw = { kind: 'Final', output };
    const rawBefore = { ...raw };

    expect(() => parseModelOutcome(raw)).toThrow(ModelOutcomeValidationError);
    expect(raw).toEqual(rawBefore);
    expect(raw.output).toBe(output);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(output)).toBe(false);
  });
});
