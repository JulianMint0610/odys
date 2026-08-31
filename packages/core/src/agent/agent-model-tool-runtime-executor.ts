import { parseModelOutcome } from '../model/model-outcome.js';
import type { ModelRuntime } from '../model/model-runtime.js';
import { createInitialModelTurn, createToolResultModelTurn } from '../model/model-turn.js';

import { AgentToolTurnLimitExceededError } from './agent-errors.js';
import type { AgentModelIdResolver } from './agent-model-runtime-executor.js';
import type { AgentRuntimeExecutor } from './agent-runtime.js';
import type { AgentToolRuntime } from './agent-tool-runtime.js';

export function createAgentModelToolRuntimeExecutor(options: {
  readonly modelRuntime: ModelRuntime;
  readonly agentToolRuntime: AgentToolRuntime;
  readonly resolveModelId: AgentModelIdResolver;
}): AgentRuntimeExecutor {
  const { modelRuntime, agentToolRuntime, resolveModelId } = options;

  return async (request) => {
    const modelId = await resolveModelId(request);
    const initialTurn = createInitialModelTurn(request);
    const initialResult = await modelRuntime.run({ modelId, input: initialTurn });
    const initialOutcome = parseModelOutcome(initialResult.output);

    if (initialOutcome.kind === 'final') {
      return initialOutcome.output;
    }

    const toolResult = await agentToolRuntime.run({
      agentId: request.agent.id,
      toolId: initialOutcome.toolId,
      input: initialOutcome.input,
    });
    const continuationTurn = createToolResultModelTurn({
      input: request,
      toolRequest: initialOutcome,
      toolResult,
    });
    const continuedResult = await modelRuntime.run({ modelId, input: continuationTurn });
    const continuedOutcome = parseModelOutcome(continuedResult.output);

    if (continuedOutcome.kind === 'tool-request') {
      throw new AgentToolTurnLimitExceededError(request.agent.id, continuedOutcome.toolId);
    }

    return continuedOutcome.output;
  };
}
