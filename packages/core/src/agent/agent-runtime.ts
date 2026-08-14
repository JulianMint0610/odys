import { InvalidAgentRuntimeRequestError, UnknownAgentError } from './agent-errors.js';
import { isCanonicalAgentId } from './agent-id.js';
import type { AgentRegistry } from './agent-registry.js';
import type { AgentDefinition } from './agent.js';

export interface AgentRuntimeRequest {
  readonly agentId: string;
  readonly input: unknown;
}

export interface AgentRuntimeResult {
  readonly agentId: string;
  readonly output: unknown;
}

export type AgentRuntimeExecutor = (request: {
  readonly agent: AgentDefinition;
  readonly input: unknown;
}) => Promise<unknown>;

export interface AgentRuntime {
  run(request: AgentRuntimeRequest): Promise<AgentRuntimeResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidRequest(message: string): never {
  throw new InvalidAgentRuntimeRequestError(`Invalid Agent runtime request: ${message}`);
}

function validateAgentRuntimeRequest(request: unknown): asserts request is AgentRuntimeRequest {
  if (!isRecord(request)) {
    rejectInvalidRequest('request must be an object');
  }

  if (!isCanonicalAgentId(request.agentId)) {
    rejectInvalidRequest('agentId must be a canonical Agent identifier');
  }

  if (!Object.hasOwn(request, 'input')) {
    rejectInvalidRequest('input must be provided');
  }
}

class CoreAgentRuntime implements AgentRuntime {
  readonly #agentRegistry: AgentRegistry;
  readonly #executor: AgentRuntimeExecutor;

  public constructor(agentRegistry: AgentRegistry, executor: AgentRuntimeExecutor) {
    this.#agentRegistry = agentRegistry;
    this.#executor = executor;
  }

  public async run(request: AgentRuntimeRequest): Promise<AgentRuntimeResult> {
    validateAgentRuntimeRequest(request);

    const agent = this.#agentRegistry.get(request.agentId);

    if (agent === undefined) {
      throw new UnknownAgentError(request.agentId);
    }

    const output = await this.#executor({ agent, input: request.input });

    return {
      agentId: agent.id,
      output,
    };
  }
}

export function createAgentRuntime(options: {
  readonly agentRegistry: AgentRegistry;
  readonly executor: AgentRuntimeExecutor;
}): AgentRuntime {
  return new CoreAgentRuntime(options.agentRegistry, options.executor);
}
