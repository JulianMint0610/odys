import { z } from 'zod';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  createToolRegistry,
  createToolRuntime,
  defineTool,
  InvalidToolRuntimePermissionResolutionError,
  InvalidToolRuntimeRequestError,
  ToolOutputValidationError,
  ToolPermissionDeniedError,
  UnknownToolError,
  type ToolDefinition,
  type ToolRisk,
  type ToolRuntime,
  type ToolRuntimeExecutor,
  type ToolRuntimePermissionIdentifierResolver,
  type ToolRuntimeRequest,
  type ToolRuntimeResult,
} from '../index.js';

interface TestToolOptions {
  readonly id?: string;
  readonly risk?: ToolRisk;
  readonly requiredPermissions?: readonly string[];
  readonly inputSchema?: z.ZodType;
  readonly outputSchema?: z.ZodType;
}

function createTestTool({
  id = 'calendar.create_event',
  risk = 'high',
  requiredPermissions = ['calendar.write'],
  inputSchema = z.object({ title: z.string().trim(), attendees: z.coerce.number().default(0) }),
  outputSchema = z.object({ eventId: z.string().trim() }),
}: TestToolOptions = {}): ToolDefinition {
  return defineTool({
    id,
    name: `${id} Tool`,
    description: `Fixture for ${id}.`,
    risk,
    inputSchema,
    outputSchema,
    requiredPermissions,
  });
}

function runtimeRequest(value: unknown): ToolRuntimeRequest {
  return value as ToolRuntimeRequest;
}

function resolverResult(value: unknown): ToolRuntimePermissionIdentifierResolver {
  return async () => value as readonly string[];
}

describe('Tool Runtime', () => {
  it('exposes the guarded Runtime contract and errors through the Core public API', () => {
    const toolRegistry = createToolRegistry();
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => [],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => null);
    const runtime: ToolRuntime = createToolRuntime({
      toolRegistry,
      resolvePermissionIdentifiers,
      executor,
    });
    const request: ToolRuntimeRequest = { toolId: 'calendar.create_event', input: null };
    type RequestHasResolvedPermissions = 'resolvedPermissions' extends keyof ToolRuntimeRequest
      ? true
      : false;
    const requestHasResolvedPermissions: RequestHasResolvedPermissions = false;

    expect(runtime.run).toBeTypeOf('function');
    expect(request).toEqual({ toolId: 'calendar.create_event', input: null });
    expect(requestHasResolvedPermissions).toBe(false);
    expect(new InvalidToolRuntimeRequestError('invalid')).toBeInstanceOf(Error);
    expect(new InvalidToolRuntimePermissionResolutionError('calendar.create_event')).toBeInstanceOf(
      Error,
    );
    expect(new UnknownToolError('calendar.create_event')).toBeInstanceOf(Error);
    expectTypeOf<ToolRuntimeResult['output']>().toEqualTypeOf<unknown>();
  });

  it('composes parsing, permission enforcement, execution, and output parsing in order', async () => {
    const calls: string[] = [];
    const toolRegistry = createToolRegistry();
    const callerTool = createTestTool({
      inputSchema: z
        .object({ title: z.string().trim(), attendees: z.coerce.number().default(0) })
        .transform((input) => {
          calls.push('input');
          return { ...input, normalized: true };
        }),
      outputSchema: z.object({ eventId: z.string().trim() }).transform((output) => {
        calls.push('output');
        return { ...output, validated: true };
      }),
    });
    const registeredTool = toolRegistry.register(callerTool);
    let resolverInput: unknown;
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async ({ tool, input }) => {
        calls.push('permission');
        expect(tool).toBe(registeredTool);
        expect(tool).not.toBe(callerTool);
        expect(Object.isFrozen(tool)).toBe(true);
        resolverInput = input;
        expect(input).toEqual({ title: 'Design review', attendees: 2, normalized: true });
        return ['calendar.write'];
      },
    );
    const executor: ToolRuntimeExecutor = vi.fn(async ({ tool, input }) => {
      calls.push('executor');
      expect(tool).toBe(registeredTool);
      expect(input).toBe(resolverInput);
      return { eventId: '  event-1  ' };
    });
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    const result: ToolRuntimeResult = await runtime.run({
      toolId: 'calendar.create_event',
      input: { title: '  Design review  ', attendees: '2', privateExtra: 'removed' },
    });

    expect(calls).toEqual(['input', 'permission', 'executor', 'output']);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
    expect(result).toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'event-1', validated: true },
    });
  });

  it.each([null, undefined, 1, 'request', [], () => undefined])(
    'rejects the non-object Runtime request %j before permission resolution or execution',
    async (request) => {
      const toolRegistry = createToolRegistry();
      const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
        async () => ['calendar.write'],
      );
      const executor: ToolRuntimeExecutor = vi.fn(async () => null);
      const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        InvalidToolRuntimeRequestError,
      );
      expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
      expect(executor).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: 'a missing Tool ID', request: { input: null } },
    { label: 'a null Tool ID', request: { toolId: null, input: null } },
    { label: 'a numeric Tool ID', request: { toolId: 1, input: null } },
    { label: 'an empty Tool ID', request: { toolId: '', input: null } },
    { label: 'a whitespace Tool ID', request: { toolId: '   ', input: null } },
    { label: 'an uppercase Tool ID', request: { toolId: 'Calendar.create_event', input: null } },
    { label: 'a padded Tool ID', request: { toolId: ' calendar.create_event ', input: null } },
    { label: 'a repeated separator Tool ID', request: { toolId: 'calendar..create', input: null } },
  ])('rejects $label without normalization or dependency invocation', async ({ request }) => {
    const toolRegistry = createToolRegistry();
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => null);
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      InvalidToolRuntimeRequestError,
    );
    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      'Invalid Tool runtime request: toolId must be a canonical Tool identifier',
    );
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('requires an own input property', async () => {
    const toolRegistry = createToolRegistry();
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => null);
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });
    const inheritedInputRequest = Object.assign(Object.create({ input: 'inherited' }), {
      toolId: 'calendar.create_event',
    }) as ToolRuntimeRequest;

    await expect(runtime.run(runtimeRequest({ toolId: 'calendar.create_event' }))).rejects.toThrow(
      InvalidToolRuntimeRequestError,
    );
    await expect(runtime.run(inheritedInputRequest)).rejects.toThrow(
      'Invalid Tool runtime request: input must be provided',
    );
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'undefined', input: undefined },
    { label: 'null', input: null },
  ])('delegates explicitly provided $label input to the Tool schema', async ({ input }) => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(
      createTestTool({
        requiredPermissions: [],
        inputSchema: z.unknown().transform((value) => ({ received: value })),
        outputSchema: z.unknown(),
      }),
    );
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(() => {
      throw new Error('must be skipped');
    });
    const executor: ToolRuntimeExecutor = vi.fn(async ({ input: parsedInput }) => parsedInput);
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(runtime.run({ toolId: 'calendar.create_event', input })).resolves.toEqual({
      toolId: 'calendar.create_event',
      output: { received: input },
    });
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).toHaveBeenCalledOnce();
  });

  it('rejects an unknown canonical Tool before permission resolution or execution', async () => {
    const toolRegistry = createToolRegistry();
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => null);
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(runtime.run({ toolId: 'calendar.unknown', input: null })).rejects.toThrow(
      UnknownToolError,
    );
    await expect(runtime.run({ toolId: 'calendar.unknown', input: null })).rejects.toThrow(
      'Tool with id "calendar.unknown" is not registered',
    );
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('resolves Tool IDs exactly', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(runtime.run({ toolId: 'calendar.create', input: null })).rejects.toThrow(
      UnknownToolError,
    );
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('does not treat caller-supplied resolvedPermissions as authority', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => [],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });
    const request = {
      toolId: 'calendar.create_event',
      input: { title: 'Review' },
      resolvedPermissions: ['calendar.write'],
    } as ToolRuntimeRequest;

    await expect(runtime.run(request)).rejects.toThrow(ToolPermissionDeniedError);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('does not resolve permissions or execute after invalid Tool input', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 1 } }),
    ).rejects.toThrow('Invalid input for Tool "calendar.create_event".');
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
  });

  it('reuses the existing permission-denied error and prevents execution', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(
      createTestTool({ requiredPermissions: ['calendar.write', 'calendar.invite'] }),
    );
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    let thrown: unknown;
    try {
      await runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolPermissionDeniedError);
    expect(thrown).toMatchObject({
      toolId: 'calendar.create_event',
      missingPermissions: ['calendar.invite'],
    });
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'null', value: null },
    { label: 'a string', value: 'calendar.write' },
    { label: 'an object', value: { permission: 'calendar.write' } },
    { label: 'an array with null', value: ['calendar.write', null] },
    { label: 'an array with a number', value: ['calendar.write', 1] },
  ])('fails closed for malformed permission resolution containing $label', async ({ value }) => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers = vi.fn(resolverResult(value));
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toMatchObject({
      name: 'InvalidToolRuntimePermissionResolutionError',
      toolId: 'calendar.create_event',
    });
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('preserves duplicate permission identifier semantics from the existing guard', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write', 'calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).resolves.toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'event-1' },
    });
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
  });

  it.each([
    { label: 'a wildcard-like identifier', identifiers: ['calendar.*'] },
    { label: 'a parent identifier', identifiers: ['calendar'] },
    { label: 'a differently cased identifier', identifiers: ['Calendar.write'] },
  ])('does not introduce matching for $label', async ({ identifiers }) => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => identifiers,
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toThrow(ToolPermissionDeniedError);
    expect(executor).not.toHaveBeenCalled();
  });

  it('skips permission resolution for a Tool with no declared requirements', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool({ requiredPermissions: [] }));
    const resolverFailure = new Error('resolver must not affect permission-free Tools');
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(() => {
      throw resolverFailure;
    });
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).resolves.toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'event-1' },
    });
    expect(resolvePermissionIdentifiers).not.toHaveBeenCalled();
    expect(executor).toHaveBeenCalledOnce();
  });

  it('propagates a synchronous resolver failure without wrapping or retrying', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const failure = new Error('Resolver failed synchronously');
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(() => {
      throw failure;
    });
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toBe(failure);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('propagates an asynchronous resolver rejection without wrapping or retrying', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const failure = new Error('Resolver rejected');
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => {
        throw failure;
      },
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toBe(failure);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).not.toHaveBeenCalled();
  });

  it('propagates a synchronous executor failure without wrapping or retrying', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const failure = new Error('Executor failed synchronously');
    const executor: ToolRuntimeExecutor = vi.fn(() => {
      throw failure;
    });
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toBe(failure);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
  });

  it('propagates an asynchronous executor rejection without wrapping or retrying', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const failure = new Error('Executor rejected');
    const executor: ToolRuntimeExecutor = vi.fn(async () => {
      throw failure;
    });
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toBe(failure);
    expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
  });

  it('validates raw executor output with the existing output error', async () => {
    const toolRegistry = createToolRegistry();
    toolRegistry.register(createTestTool());
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 1 }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toThrow(ToolOutputValidationError);
    expect(executor).toHaveBeenCalledOnce();
  });

  it('resolves Tools registered after Runtime construction', async () => {
    const toolRegistry = createToolRegistry();
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async () => ['calendar.write'],
    );
    const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    toolRegistry.register(createTestTool());

    await expect(
      runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).resolves.toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'event-1' },
    });
  });

  it('keeps separate Registry and Runtime compositions isolated', async () => {
    const firstRegistry = createToolRegistry();
    const secondRegistry = createToolRegistry();
    const firstResolver: ToolRuntimePermissionIdentifierResolver = vi.fn(async () => [
      'calendar.write',
    ]);
    const secondResolver: ToolRuntimePermissionIdentifierResolver = vi.fn(async () => [
      'calendar.write',
    ]);
    const firstExecutor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'first' }));
    const secondExecutor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'second' }));
    const firstRuntime = createToolRuntime({
      toolRegistry: firstRegistry,
      resolvePermissionIdentifiers: firstResolver,
      executor: firstExecutor,
    });
    const secondRuntime = createToolRuntime({
      toolRegistry: secondRegistry,
      resolvePermissionIdentifiers: secondResolver,
      executor: secondExecutor,
    });

    firstRegistry.register(createTestTool());

    await expect(
      firstRuntime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).resolves.toEqual({
      toolId: 'calendar.create_event',
      output: { eventId: 'first' },
    });
    await expect(
      secondRuntime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
    ).rejects.toThrow(UnknownToolError);
    expect(firstResolver).toHaveBeenCalledOnce();
    expect(secondResolver).not.toHaveBeenCalled();
    expect(firstExecutor).toHaveBeenCalledOnce();
    expect(secondExecutor).not.toHaveBeenCalled();
  });

  it('dispatches stable Registry state after caller mutation without mutating it', async () => {
    const toolRegistry = createToolRegistry();
    const requiredPermissions = ['calendar.write'];
    const callerTool = createTestTool({ risk: 'low', requiredPermissions });
    const registeredTool = toolRegistry.register(callerTool);
    const registeredState = { ...registeredTool };
    const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
      async ({ tool }) => {
        expect(tool).toBe(registeredTool);
        expect(tool.risk).toBe('low');
        expect(tool.requiredPermissions).toEqual(['calendar.write']);
        return ['calendar.write'];
      },
    );
    const executor: ToolRuntimeExecutor = vi.fn(async ({ tool }) => {
      expect(tool).toBe(registeredTool);
      return { eventId: 'event-1' };
    });
    const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

    (callerTool as { risk: ToolRisk }).risk = 'critical';
    requiredPermissions.push('calendar.invite');

    await runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } });

    expect(registeredTool).toEqual(registeredState);
    expect(registeredTool.requiredPermissions).toEqual(['calendar.write']);
    expect(Object.isFrozen(registeredTool)).toBe(true);
    expect(Object.isFrozen(registeredTool.requiredPermissions)).toBe(true);
    expect(toolRegistry.get('calendar.create_event')).toBe(registeredTool);
  });

  it.each<ToolRisk>(['low', 'medium', 'high', 'critical'])(
    'does not derive automatic execution behavior from Tool risk %s',
    async (risk) => {
      const toolRegistry = createToolRegistry();
      toolRegistry.register(createTestTool({ risk }));
      const resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver = vi.fn(
        async () => ['calendar.write'],
      );
      const executor: ToolRuntimeExecutor = vi.fn(async () => ({ eventId: 'event-1' }));
      const runtime = createToolRuntime({ toolRegistry, resolvePermissionIdentifiers, executor });

      await expect(
        runtime.run({ toolId: 'calendar.create_event', input: { title: 'Review' } }),
      ).resolves.toEqual({
        toolId: 'calendar.create_event',
        output: { eventId: 'event-1' },
      });
      expect(resolvePermissionIdentifiers).toHaveBeenCalledOnce();
      expect(executor).toHaveBeenCalledOnce();
    },
  );
});
