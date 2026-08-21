import { DuplicateAgentIdError } from './agent-errors.js';
import type { AgentDefinition } from './agent.js';
import { defineAgent } from './define-agent.js';

export interface AgentRegistry {
  register(agent: AgentDefinition): AgentDefinition;
  get(agentId: string): AgentDefinition | undefined;
  has(agentId: string): boolean;
  list(): readonly AgentDefinition[];
}

class CoreAgentRegistry implements AgentRegistry {
  readonly #agents = new Map<string, AgentDefinition>();

  public register(agent: AgentDefinition): AgentDefinition {
    const validAgent = defineAgent(agent);
    const { id } = validAgent;

    if (this.#agents.has(id)) {
      throw new DuplicateAgentIdError(id);
    }

    const allowedTools = Object.freeze([...validAgent.allowedTools]);
    const registeredAgent = Object.freeze({
      id: validAgent.id,
      name: validAgent.name,
      version: validAgent.version,
      description: validAgent.description,
      responsibility: validAgent.responsibility,
      allowedTools,
    });

    this.#agents.set(id, registeredAgent);
    return registeredAgent;
  }

  public get(agentId: string): AgentDefinition | undefined {
    return this.#agents.get(agentId);
  }

  public has(agentId: string): boolean {
    return this.#agents.has(agentId);
  }

  public list(): readonly AgentDefinition[] {
    return Object.freeze([...this.#agents.values()]);
  }
}

export function createAgentRegistry(): AgentRegistry {
  return new CoreAgentRegistry();
}
