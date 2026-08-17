import { describe, expect, it, vi } from 'vitest';

import {
  createAgentRegistry,
  createAgentRuntime,
  createToolRegistry,
  defineAgent,
  defineTool,
  InvalidAgentRuntimeRequestError,
  UnknownAgentError,
  type AgentDefinition,
  type AgentRuntime,
  type AgentRuntimeExecutor,
  type AgentRuntimeRequest,
  type AgentRuntimeResult,
} from '../index.js';

function createTestAgent(id: string): AgentDefinition {
  return defineAgent({
    id,
    name: `${id} Agent`,
    version: '0.1.0',
    description: `Fixture for ${id}.`,
    responsibility: `Test the ${id} Runtime path.`,
  });
}

function runtimeRequest(value: unknown): AgentRuntimeRequest {
  return value as AgentRuntimeRequest;
}

describe('Agent Runtime', () => {
  it('dispatches the exact registered Agent and opaque input exactly once', async () => {
    const agentRegistry = createAgentRegistry();
    const agent = createTestAgent('coding-agent');
    const input = { prompt: 'Review this repository.' };
    const output = { summary: 'Repository reviewed.' };
    const registeredAgent = agentRegistry.register(agent);
    const executor: AgentRuntimeExecutor = vi.fn(async (request) => {
      expect(request.agent).toBe(registeredAgent);
      expect(request.agent).not.toBe(agent);
      expect(request.input).toBe(input);
      return output;
    });
    const runtime: AgentRuntime = createAgentRuntime({ agentRegistry, executor });

    const result: AgentRuntimeResult = await runtime.run({ agentId: 'coding-agent', input });

    expect(executor).toHaveBeenCalledOnce();
    expect(result).toEqual({ agentId: 'coding-agent', output });
    expect(result.output).toBe(output);
  });

  it('resolves Agents by exact stable ID', async () => {
    const agentRegistry = createAgentRegistry();
    const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createAgentRuntime({ agentRegistry, executor });

    agentRegistry.register(createTestAgent('coding-agent'));

    await expect(runtime.run({ agentId: 'coding', input: null })).rejects.toThrow(
      UnknownAgentError,
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it.each([null, undefined, 1, 'request', [], () => undefined])(
    'rejects the non-object Runtime request %j before dispatch',
    async (request) => {
      const agentRegistry = createAgentRegistry();
      const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
      const runtime = createAgentRuntime({ agentRegistry, executor });

      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        InvalidAgentRuntimeRequestError,
      );
      await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
        'Invalid Agent runtime request: request must be an object',
      );
      expect(executor).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: 'a missing Agent ID', request: { input: null } },
    { label: 'a null Agent ID', request: { agentId: null, input: null } },
    { label: 'a numeric Agent ID', request: { agentId: 1, input: null } },
    { label: 'an empty Agent ID', request: { agentId: '', input: null } },
    { label: 'a whitespace Agent ID', request: { agentId: '   ', input: null } },
    { label: 'an uppercase Agent ID', request: { agentId: 'Coding-agent', input: null } },
    { label: 'an underscored Agent ID', request: { agentId: 'coding_agent', input: null } },
    { label: 'a padded Agent ID', request: { agentId: ' coding-agent ', input: null } },
  ])('rejects $label before dispatch', async ({ request }) => {
    const agentRegistry = createAgentRegistry();
    const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      InvalidAgentRuntimeRequestError,
    );
    await expect(runtime.run(runtimeRequest(request))).rejects.toThrow(
      'Invalid Agent runtime request: agentId must be a canonical Agent identifier',
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it('requires an own input property before dispatch', async () => {
    const agentRegistry = createAgentRegistry();
    const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createAgentRuntime({ agentRegistry, executor });
    const inheritedInputRequest = Object.assign(Object.create({ input: 'inherited' }), {
      agentId: 'coding-agent',
    }) as AgentRuntimeRequest;

    await expect(runtime.run(runtimeRequest({ agentId: 'coding-agent' }))).rejects.toThrow(
      InvalidAgentRuntimeRequestError,
    );
    await expect(runtime.run(inheritedInputRequest)).rejects.toThrow(
      'Invalid Agent runtime request: input must be provided',
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it('accepts an explicitly provided undefined input', async () => {
    const agentRegistry = createAgentRegistry();
    const agent = createTestAgent('coding-agent');
    const executor: AgentRuntimeExecutor = vi.fn(async ({ input }) => input);
    const runtime = createAgentRuntime({ agentRegistry, executor });

    agentRegistry.register(agent);

    await expect(runtime.run({ agentId: 'coding-agent', input: undefined })).resolves.toEqual({
      agentId: 'coding-agent',
      output: undefined,
    });
    expect(executor).toHaveBeenCalledOnce();
  });

  it('rejects an unknown Agent deterministically without dispatch', async () => {
    const agentRegistry = createAgentRegistry();
    const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createAgentRuntime({ agentRegistry, executor });

    await expect(runtime.run({ agentId: 'unknown-agent', input: null })).rejects.toThrow(
      UnknownAgentError,
    );
    await expect(runtime.run({ agentId: 'unknown-agent', input: null })).rejects.toThrow(
      'Agent with id "unknown-agent" is not registered',
    );
    expect(executor).not.toHaveBeenCalled();
  });

  it('propagates an asynchronous executor rejection without wrapping or retrying', async () => {
    const agentRegistry = createAgentRegistry();
    const failure = new Error('Executor failed');
    const executor: AgentRuntimeExecutor = vi.fn(async () => {
      throw failure;
    });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    agentRegistry.register(createTestAgent('coding-agent'));

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toBe(failure);
    expect(executor).toHaveBeenCalledOnce();
  });

  it('propagates a synchronous executor failure without wrapping or retrying', async () => {
    const agentRegistry = createAgentRegistry();
    const failure = new Error('Executor failed synchronously');
    const executor: AgentRuntimeExecutor = vi.fn(() => {
      throw failure;
    });
    const runtime = createAgentRuntime({ agentRegistry, executor });

    agentRegistry.register(createTestAgent('coding-agent'));

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).rejects.toBe(failure);
    expect(executor).toHaveBeenCalledOnce();
  });

  it('resolves Agents registered after Runtime construction', async () => {
    const agentRegistry = createAgentRegistry();
    const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createAgentRuntime({ agentRegistry, executor });

    agentRegistry.register(createTestAgent('coding-agent'));

    await expect(runtime.run({ agentId: 'coding-agent', input: null })).resolves.toEqual({
      agentId: 'coding-agent',
      output: 'completed',
    });
  });

  it('keeps separate Registry and Runtime compositions isolated', async () => {
    const firstRegistry = createAgentRegistry();
    const secondRegistry = createAgentRegistry();
    const firstExecutor: AgentRuntimeExecutor = vi.fn(async () => 'first');
    const secondExecutor: AgentRuntimeExecutor = vi.fn(async () => 'second');
    const firstRuntime = createAgentRuntime({
      agentRegistry: firstRegistry,
      executor: firstExecutor,
    });
    const secondRuntime = createAgentRuntime({
      agentRegistry: secondRegistry,
      executor: secondExecutor,
    });

    firstRegistry.register(createTestAgent('coding-agent'));

    await expect(firstRuntime.run({ agentId: 'coding-agent', input: null })).resolves.toEqual({
      agentId: 'coding-agent',
      output: 'first',
    });
    await expect(secondRuntime.run({ agentId: 'coding-agent', input: null })).rejects.toThrow(
      UnknownAgentError,
    );
    expect(firstExecutor).toHaveBeenCalledOnce();
    expect(secondExecutor).not.toHaveBeenCalled();
  });

  it('does not derive Agent execution eligibility from Tool Registry membership', async () => {
    const agentRegistry = createAgentRegistry();
    const toolRegistry = createToolRegistry();
    const executor: AgentRuntimeExecutor = vi.fn(async () => 'completed');
    const runtime = createAgentRuntime({ agentRegistry, executor });

    toolRegistry.register(
      defineTool({
        id: 'coding',
        name: 'Coding Tool',
        description: 'A non-executable Tool definition fixture.',
        risk: 'low',
      }),
    );

    await expect(runtime.run({ agentId: 'coding', input: null })).rejects.toThrow(
      UnknownAgentError,
    );
    expect(toolRegistry.has('coding')).toBe(true);
    expect(executor).not.toHaveBeenCalled();
  });
});
