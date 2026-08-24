import { InvalidAgentToolRuntimeRequestError, UnknownAgentError } from './agent-errors.js';
import { isCanonicalAgentId } from './agent-id.js';
import type { AgentRegistry } from './agent-registry.js';
import { assertAgentToolAllowed } from './agent-tool-allowlist.js';
import { isCanonicalToolId } from '../tool/tool-id.js';
import type { ToolRuntime, ToolRuntimeResult } from '../tool/tool-runtime.js';

export interface AgentToolRuntimeRequest {
  readonly agentId: string;
  readonly toolId: string;
  readonly input: unknown;
}

export interface AgentToolRuntime {
  run(request: AgentToolRuntimeRequest): Promise<ToolRuntimeResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidRequest(message: string): never {
  throw new InvalidAgentToolRuntimeRequestError(`Invalid Agent Tool runtime request: ${message}`);
}

function validateAgentToolRuntimeRequest(
  request: unknown,
): asserts request is AgentToolRuntimeRequest {
  if (!isRecord(request)) {
    rejectInvalidRequest('request must be an object');
  }

  if (!isCanonicalAgentId(request.agentId)) {
    rejectInvalidRequest('agentId must be a canonical Agent identifier');
  }

  if (!isCanonicalToolId(request.toolId)) {
    rejectInvalidRequest('toolId must be a canonical Tool identifier');
  }

  if (!Object.hasOwn(request, 'input')) {
    rejectInvalidRequest('input must be provided');
  }
}

class CoreAgentToolRuntime implements AgentToolRuntime {
  readonly #agentRegistry: AgentRegistry;
  readonly #toolRuntime: ToolRuntime;

  public constructor(agentRegistry: AgentRegistry, toolRuntime: ToolRuntime) {
    this.#agentRegistry = agentRegistry;
    this.#toolRuntime = toolRuntime;
  }

  public async run(request: AgentToolRuntimeRequest): Promise<ToolRuntimeResult> {
    validateAgentToolRuntimeRequest(request);

    const agent = this.#agentRegistry.get(request.agentId);

    if (agent === undefined) {
      throw new UnknownAgentError(request.agentId);
    }

    assertAgentToolAllowed(agent, request.toolId);

    return this.#toolRuntime.run({ toolId: request.toolId, input: request.input });
  }
}

export function createAgentToolRuntime(options: {
  readonly agentRegistry: AgentRegistry;
  readonly toolRuntime: ToolRuntime;
}): AgentToolRuntime {
  return new CoreAgentToolRuntime(options.agentRegistry, options.toolRuntime);
}
