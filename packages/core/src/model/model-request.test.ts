import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createModelRequest,
  createModelResponse,
  InvalidModelRequestError,
  type ModelRequest,
  type ModelRequestInputItem,
  type ModelRequestTool,
  type ModelResponseToolRequest,
} from '../index.js';

function runtimeRequest(value: unknown): ModelRequest {
  return value as ModelRequest;
}

function emptyRequest(overrides: Record<string, unknown> = {}): ModelRequest {
  return {
    instructions: [],
    input: [],
    tools: [],
    ...overrides,
  } as ModelRequest;
}

describe('Model Request', () => {
  it('exposes the minimal provider-independent public contract through Core', () => {
    const options: ModelRequest = { instructions: [], input: [], tools: [] };
    const first = createModelRequest(options);
    const second = createModelRequest(options);

    expect(first).toEqual({ instructions: [], input: [], tools: [] });
    expect(Object.keys(first)).toEqual(['instructions', 'input', 'tools']);
    expect(first).not.toBe(options);
    expect(first).not.toBe(second);
    expect(first.instructions).not.toBe(second.instructions);
    expect(first.input).not.toBe(second.input);
    expect(first.tools).not.toBe(second.tools);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.instructions)).toBe(true);
    expect(Object.isFrozen(first.input)).toBe(true);
    expect(Object.isFrozen(first.tools)).toBe(true);
    expect(Object.isFrozen(options)).toBe(false);
    expectTypeOf(first).toMatchTypeOf<ModelRequest>();
    expectTypeOf<ModelRequestInputItem>().toEqualTypeOf<ModelRequest['input'][number]>();
    expectTypeOf<ModelRequestTool>().toEqualTypeOf<ModelRequest['tools'][number]>();
  });

  it('preserves instruction declaration order and exact strings in a frozen snapshot', () => {
    const instructions = ['Follow Core instructions.', '', '  Keep this spacing.  '];
    const request = createModelRequest({ instructions, input: [], tools: [] });

    expect(request.instructions).toEqual(instructions);
    expect(request.instructions).not.toBe(instructions);
    expect(Object.isFrozen(request.instructions)).toBe(true);
    expect(Object.isFrozen(instructions)).toBe(false);

    instructions.reverse();
    instructions.push('Later instruction.');

    expect(request.instructions).toEqual([
      'Follow Core instructions.',
      '',
      '  Keep this spacing.  ',
    ]);
  });

  it('snapshots ordered message and Tool-result wrappers while preserving nested identity', () => {
    const content = { parts: [{ text: 'Find the event.' }] };
    const assistantContent = { text: 'Looking up the event.' };
    const toolInput = { query: 'review' };
    const response = createModelResponse({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [{ toolId: 'future.lookup', input: toolInput }],
      finishReason: 'tool-request',
    });
    const toolRequest = response.toolRequests[0];
    if (toolRequest === undefined) {
      throw new Error('Expected a canonical Tool request');
    }
    const output = { event: { id: 'event-1' } };
    const userMessage = { kind: 'message' as const, role: 'user' as const, content };
    const assistantMessage = {
      kind: 'message' as const,
      role: 'assistant' as const,
      content: assistantContent,
    };
    const toolResult = { kind: 'tool-result' as const, toolRequest, output };
    const input = [userMessage, assistantMessage, toolResult];

    const request = createModelRequest({ instructions: [], input, tools: [] });

    expect(request.input).toEqual(input);
    expect(request.input).not.toBe(input);
    expect(request.input[0]).not.toBe(userMessage);
    expect(request.input[1]).not.toBe(assistantMessage);
    expect(request.input[2]).not.toBe(toolResult);
    const [userItem, assistantItem, resultItem] = request.input;
    if (
      userItem?.kind !== 'message' ||
      assistantItem?.kind !== 'message' ||
      resultItem?.kind !== 'tool-result'
    ) {
      throw new Error('Expected ordered message, message, and Tool-result input');
    }
    expect(userItem.role).toBe('user');
    expect(userItem.content).toBe(content);
    expect(assistantItem.role).toBe('assistant');
    expect(assistantItem.content).toBe(assistantContent);
    expect(resultItem.toolRequest).toBe(toolRequest);
    expect(resultItem.toolRequest.input).toBe(toolInput);
    expect(resultItem.output).toBe(output);
    expect(Object.isFrozen(request.input)).toBe(true);
    for (const item of request.input) {
      expect(Object.isFrozen(item)).toBe(true);
    }
    for (const value of [input, ...input, content, content.parts, assistantContent, output]) {
      expect(Object.isFrozen(value)).toBe(false);
    }
    expect(Object.isFrozen(toolInput)).toBe(false);
    expect(Object.isFrozen(output.event)).toBe(false);
  });

  it('preserves Tool order, optional description, and opaque schema references', () => {
    const inputSchema = { fields: { query: 'opaque' } };
    const firstTool = { id: 'future.lookup', description: '  Find events.  ', inputSchema };
    const secondTool = { id: 'future.send', inputSchema: undefined };
    const tools = [firstTool, secondTool];

    const request = createModelRequest({ instructions: [], input: [], tools });

    expect(request.tools).toEqual(tools);
    expect(request.tools.map(({ id }) => id)).toEqual(['future.lookup', 'future.send']);
    expect(request.tools[0]?.description).toBe('  Find events.  ');
    expect(request.tools[1]).not.toHaveProperty('description');
    expect(request.tools[0]?.inputSchema).toBe(inputSchema);
    expect(request.tools).not.toBe(tools);
    expect(request.tools[0]).not.toBe(firstTool);
    expect(request.tools[1]).not.toBe(secondTool);
    expect(Object.isFrozen(request.tools)).toBe(true);
    expect(Object.isFrozen(request.tools[0])).toBe(true);
    expect(Object.isFrozen(request.tools[1])).toBe(true);
    for (const value of [tools, firstTool, secondTool, inputSchema, inputSchema.fields]) {
      expect(Object.isFrozen(value)).toBe(false);
    }
  });

  it('isolates canonical structure from later caller array, wrapper, and outer mutations', () => {
    const content = { text: 'original' };
    const output = { value: 'original' };
    const inputSchema = { field: 'original' };
    const outputSchema = { result: 'original' };
    const toolRequest: ModelResponseToolRequest = { toolId: 'future.lookup', input: null };
    const message = { kind: 'message' as const, role: 'user' as 'user' | 'assistant', content };
    const toolResult = { kind: 'tool-result' as const, toolRequest, output };
    const tool = { id: 'future.lookup', description: 'Original description.', inputSchema };
    const instructions = ['Original instruction.'];
    const input: ModelRequestInputItem[] = [message, toolResult];
    const tools: ModelRequestTool[] = [tool];
    const options = { instructions, input, tools, outputSchema };
    const request = createModelRequest(options);

    instructions[0] = 'Changed instruction.';
    instructions.push('Added instruction.');
    input.reverse();
    input.push({ kind: 'message', role: 'assistant', content: 'Added message.' });
    message.role = 'assistant';
    message.content = { text: 'replacement' };
    toolResult.toolRequest = { toolId: 'future.changed', input: undefined };
    toolResult.output = { value: 'replacement' };
    tools.push({ id: 'future.added', inputSchema: null });
    tool.id = 'future.changed';
    tool.description = 'Changed description.';
    tool.inputSchema = { field: 'replacement' };
    options.instructions = [];
    options.input = [];
    options.tools = [];
    options.outputSchema = { result: 'replacement' };

    expect(request).toEqual({
      instructions: ['Original instruction.'],
      input: [
        { kind: 'message', role: 'user', content },
        { kind: 'tool-result', toolRequest, output },
      ],
      tools: [{ id: 'future.lookup', description: 'Original description.', inputSchema }],
      outputSchema,
    });
    expect(request.outputSchema).toBe(outputSchema);
  });

  it('retains mutable nested values without parsing, cloning, freezing, or normalizing them', () => {
    const opaque = {
      nested: { value: 'original' },
      safeParse: () => {
        throw new Error('Opaque schema must not be executed');
      },
    };
    const toolRequest = { toolId: 'future.lookup', input: opaque };
    const request = createModelRequest({
      instructions: [],
      input: [
        { kind: 'message', role: 'user', content: opaque },
        { kind: 'tool-result', toolRequest, output: opaque },
      ],
      tools: [{ id: 'future.lookup', inputSchema: opaque }],
      outputSchema: opaque,
    });
    const [message, toolResult] = request.input;
    if (message?.kind !== 'message' || toolResult?.kind !== 'tool-result') {
      throw new Error('Expected message and Tool-result input');
    }

    expect(message.content).toBe(opaque);
    expect(toolResult.output).toBe(opaque);
    expect(toolResult.toolRequest).toBe(toolRequest);
    expect(toolResult.toolRequest.input).toBe(opaque);
    expect(request.tools[0]?.inputSchema).toBe(opaque);
    expect(request.outputSchema).toBe(opaque);
    expect(Object.isFrozen(toolRequest)).toBe(false);
    expect(Object.isFrozen(opaque)).toBe(false);
    expect(Object.isFrozen(opaque.nested)).toBe(false);

    opaque.nested.value = 'changed';
    expect((message.content as typeof opaque).nested.value).toBe('changed');
  });

  it.each([undefined, null, 0, false, '', ['opaque'], () => undefined])(
    'accepts explicitly present opaque values %j without imposing schema or content types',
    (opaque) => {
      const toolRequest = { toolId: 'future.lookup', input: opaque };
      const request = createModelRequest({
        instructions: [],
        input: [
          { kind: 'message', role: 'user', content: opaque },
          { kind: 'tool-result', toolRequest, output: opaque },
        ],
        tools: [{ id: 'future.lookup', inputSchema: opaque }],
        outputSchema: opaque,
      });

      expect(request.input).toEqual([
        { kind: 'message', role: 'user', content: opaque },
        { kind: 'tool-result', toolRequest, output: opaque },
      ]);
      expect(Object.hasOwn(request, 'outputSchema')).toBe(true);
      expect(request.outputSchema).toBe(opaque);
      expect(request.tools[0]?.inputSchema).toBe(opaque);
    },
  );

  it('projects only supported own fields while ignoring unsupported metadata', () => {
    const toolRequest = createModelResponse({
      content: undefined,
      structuredOutput: undefined,
      toolRequests: [{ toolId: 'future.lookup', input: null }],
      finishReason: 'tool-request',
    }).toolRequests[0];
    const request = createModelRequest(
      emptyRequest({
        input: [
          { kind: 'message', role: 'user', content: null, provider: 'unused', authorization: true },
          { kind: 'tool-result', toolRequest, output: null, approval: true },
        ],
        tools: [
          {
            id: 'future.lookup',
            description: 'Find events.',
            inputSchema: null,
            requiredPermissions: ['events.read'],
            risk: 'critical',
            executor: () => {
              throw new Error('Tool declaration must not execute');
            },
            authorization: true,
          },
        ],
        provider: 'unused',
        providerModelId: 'unused',
        apiKey: 'unused',
        timeoutMs: 1,
        retryCount: 1,
        authorization: true,
        approval: true,
      }),
    );

    expect(Object.keys(request)).toEqual(['instructions', 'input', 'tools']);
    expect(Object.keys(request.input[0] ?? {})).toEqual(['kind', 'role', 'content']);
    expect(Object.keys(request.input[1] ?? {})).toEqual(['kind', 'toolRequest', 'output']);
    expect(Object.keys(request.tools[0] ?? {})).toEqual(['id', 'description', 'inputSchema']);

    const inheritedOptions = Object.assign(Object.create({ outputSchema: 'inherited' }), {
      instructions: [],
      input: [],
      tools: [
        Object.assign(Object.create({ description: 'inherited' }), {
          id: 'future.lookup',
          inputSchema: null,
        }),
      ],
    });
    const projected = createModelRequest(runtimeRequest(inheritedOptions));
    expect(projected).not.toHaveProperty('outputSchema');
    expect(projected.tools[0]).not.toHaveProperty('description');
  });

  it('accepts null-prototype objects using the existing Core object convention', () => {
    const options = Object.assign(Object.create(null), {
      instructions: [],
      input: [
        Object.assign(Object.create(null), { kind: 'message', role: 'user', content: undefined }),
      ],
      tools: [Object.assign(Object.create(null), { id: 'future.lookup', inputSchema: undefined })],
    });

    expect(createModelRequest(runtimeRequest(options))).toEqual(options);
  });

  it.each([null, undefined, 1, true, 'request', [], () => undefined])(
    'rejects non-object request options %j with the canonical error',
    (options) => {
      expect(() => createModelRequest(runtimeRequest(options))).toThrow(InvalidModelRequestError);
      expect(() => createModelRequest(runtimeRequest(options))).toThrow(
        'Invalid Model request: options must be an object',
      );
    },
  );

  it.each(['instructions', 'input', 'tools'])(
    'requires %s to be an own array property',
    (field) => {
      const options: Record<string, unknown> = { instructions: [], input: [], tools: [] };
      delete options[field];
      const inherited = Object.assign(Object.create({ [field]: [] }), options);

      for (const value of [options, inherited]) {
        expect(() => createModelRequest(runtimeRequest(value))).toThrow(
          `Invalid Model request: ${field} must be provided`,
        );
      }
      for (const value of [undefined, null, 1, 'array', {}, new Set()]) {
        expect(() => createModelRequest(emptyRequest({ [field]: value }))).toThrow(
          `Invalid Model request: ${field} must be an array`,
        );
      }
    },
  );

  it.each([undefined, null, 1, true, {}, []])('rejects non-string instruction %j', (value) => {
    expect(() => createModelRequest(emptyRequest({ instructions: ['Valid.', value] }))).toThrow(
      'Invalid Model request: instructions[1] must be a string',
    );
  });

  it.each(['instructions', 'input', 'tools'])('rejects sparse %s arrays', (field) => {
    expect(() => createModelRequest(emptyRequest({ [field]: new Array(2) }))).toThrow(
      InvalidModelRequestError,
    );
  });

  it.each([null, undefined, 1, 'item', [], () => undefined])(
    'rejects malformed input and Tool wrappers %j',
    (value) => {
      expect(() => createModelRequest(emptyRequest({ input: [value] }))).toThrow(
        'Invalid Model request: input[0] must be an object',
      );
      expect(() => createModelRequest(emptyRequest({ tools: [value] }))).toThrow(
        'Invalid Model request: tools[0] must be an object',
      );
      expect(() =>
        createModelRequest(
          emptyRequest({ input: [{ kind: 'tool-result', toolRequest: value, output: null }] }),
        ),
      ).toThrow('Invalid Model request: input[0].toolRequest must be an object');
    },
  );

  it.each(['Message', ' message', 'tool-request', 'tool_result', '', null, undefined])(
    'rejects unsupported input kind %j without normalization',
    (kind) => {
      expect(() =>
        createModelRequest(emptyRequest({ input: [{ kind, role: 'user', content: null }] })),
      ).toThrow('Invalid Model request: input[0].kind must be "message" or "tool-result"');
    },
  );

  it.each(['system', 'tool', 'User', ' assistant ', '', null, undefined])(
    'rejects unsupported message role %j',
    (role) => {
      expect(() =>
        createModelRequest(emptyRequest({ input: [{ kind: 'message', role, content: null }] })),
      ).toThrow('Invalid Model request: input[0].role must be "user" or "assistant"');
    },
  );

  it.each(['kind', 'role', 'content'])('requires message %s to be an own property', (field) => {
    const item: Record<string, unknown> = { kind: 'message', role: 'user', content: undefined };
    const inheritedValue = item[field];
    delete item[field];
    const inherited = Object.assign(Object.create({ [field]: inheritedValue }), item);

    for (const value of [item, inherited]) {
      expect(() => createModelRequest(emptyRequest({ input: [value] }))).toThrow(
        `Invalid Model request: input[0].${field} must be provided`,
      );
    }
  });

  it.each(['kind', 'toolRequest', 'output'])(
    'requires Tool-result %s to be an own property',
    (field) => {
      const item: Record<string, unknown> = {
        kind: 'tool-result',
        toolRequest: { toolId: 'future.lookup', input: undefined },
        output: undefined,
      };
      const inheritedValue = item[field];
      delete item[field];
      const inherited = Object.assign(Object.create({ [field]: inheritedValue }), item);

      for (const value of [item, inherited]) {
        expect(() => createModelRequest(emptyRequest({ input: [value] }))).toThrow(
          `Invalid Model request: input[0].${field} must be provided`,
        );
      }
    },
  );

  it.each(['toolId', 'input'])('requires nested Tool-request %s to be an own property', (field) => {
    const toolRequest: Record<string, unknown> = { toolId: 'future.lookup', input: undefined };
    const inheritedValue = toolRequest[field];
    delete toolRequest[field];
    const inherited = Object.assign(Object.create({ [field]: inheritedValue }), toolRequest);

    for (const value of [toolRequest, inherited]) {
      expect(() =>
        createModelRequest(
          emptyRequest({ input: [{ kind: 'tool-result', toolRequest: value, output: null }] }),
        ),
      ).toThrow(`Invalid Model request: input[0].toolRequest.${field} must be provided`);
    }
  });

  it.each(['id', 'inputSchema'])('requires Tool %s to be an own property', (field) => {
    const tool: Record<string, unknown> = { id: 'future.lookup', inputSchema: undefined };
    const inheritedValue = tool[field];
    delete tool[field];
    const inherited = Object.assign(Object.create({ [field]: inheritedValue }), tool);

    for (const value of [tool, inherited]) {
      expect(() => createModelRequest(emptyRequest({ tools: [value] }))).toThrow(
        `Invalid Model request: tools[0].${field} must be provided`,
      );
    }
  });

  it.each(['search', 'future.lookup', 'future.lookup-v2', 'future.lookup_v2', 'a1.b2'])(
    'accepts canonical Tool ID %s without Registry or declaration membership lookup',
    (id) => {
      expect(
        createModelRequest(emptyRequest({ tools: [{ id, inputSchema: null }] })).tools,
      ).toEqual([{ id, inputSchema: null }]);
      const toolRequest = { toolId: id, input: undefined };
      const request = createModelRequest({
        instructions: [],
        input: [{ kind: 'tool-result', toolRequest, output: undefined }],
        tools: [],
      });
      expect(request.input).toEqual([{ kind: 'tool-result', toolRequest, output: undefined }]);
    },
  );

  it.each([
    '',
    'Future.lookup',
    'future.*',
    'future/lookup',
    '.future.lookup',
    'future..lookup',
    'future.lookup.',
    ' future.lookup',
    'future.lookup ',
    '1future.lookup',
    null,
    undefined,
    1,
  ])('rejects malformed Tool ID %j in declarations and Tool results', (id) => {
    expect(() => createModelRequest(emptyRequest({ tools: [{ id, inputSchema: null }] }))).toThrow(
      'Invalid Model request: tools[0].id must be a canonical Tool identifier',
    );
    expect(() =>
      createModelRequest(
        emptyRequest({
          input: [{ kind: 'tool-result', toolRequest: { toolId: id, input: null }, output: null }],
        }),
      ),
    ).toThrow(
      'Invalid Model request: input[0].toolRequest.toolId must be a canonical Tool identifier',
    );
  });

  it.each(['', '  ', '\n', null, undefined, 1, {}, []])(
    'rejects present descriptions that are not non-empty strings: %j',
    (description) => {
      expect(() =>
        createModelRequest(
          emptyRequest({ tools: [{ id: 'future.lookup', description, inputSchema: null }] }),
        ),
      ).toThrow('Invalid Model request: tools[0].description must be a non-empty string');
    },
  );

  it('rejects duplicate Tool IDs without mutating or freezing caller-owned data', () => {
    const content = { nested: { value: 1 } };
    const message = { kind: 'message' as const, role: 'user' as const, content };
    const tool = { id: 'future.lookup', inputSchema: content };
    const instructions = ['Instruction.'];
    const input = [message];
    const tools = [tool, { id: 'future.other', inputSchema: null }, { ...tool }];
    const options = { instructions, input, tools };

    expect(() => createModelRequest(options)).toThrow(InvalidModelRequestError);
    expect(() => createModelRequest(options)).toThrow(
      'Invalid Model request: tools[2].id must not duplicate an earlier Tool identifier',
    );
    for (const value of [
      options,
      instructions,
      input,
      message,
      tools,
      ...tools,
      content,
      content.nested,
    ]) {
      expect(Object.isFrozen(value)).toBe(false);
    }
    expect(instructions).toEqual(['Instruction.']);
    expect(input).toEqual([message]);
    expect(tools.map(({ id }) => id)).toEqual(['future.lookup', 'future.other', 'future.lookup']);
    expect(content).toEqual({ nested: { value: 1 } });
  });
});
