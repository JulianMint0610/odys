import { AgentToolNotAllowedError } from './agent-errors.js';
import type { AgentDefinition } from './agent.js';

export interface AgentToolAllowanceEvaluation {
  readonly isAllowed: boolean;
}

export function evaluateAgentToolAllowance(
  definition: AgentDefinition,
  toolId: string,
): AgentToolAllowanceEvaluation {
  return Object.freeze({
    isAllowed: definition.allowedTools.includes(toolId),
  });
}

export function assertAgentToolAllowed(definition: AgentDefinition, toolId: string): void {
  const evaluation = evaluateAgentToolAllowance(definition, toolId);

  if (!evaluation.isAllowed) {
    throw new AgentToolNotAllowedError(definition.id, toolId);
  }
}
