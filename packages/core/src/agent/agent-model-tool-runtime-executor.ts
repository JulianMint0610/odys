import { parseModelOutcome, type ModelOutcome } from '../model/model-outcome.js';
import type { ModelRuntime } from '../model/model-runtime.js';
import type { ToolRuntimeResult } from '../tool/tool-runtime.js';

import { AgentToolTurnLimitExceededError } from './agent-errors.js';
import type { AgentModelIdResolver } from './agent-model-runtime-executor.js';
import type { AgentRuntimeExecutor } from './agent-runtime.js';
import type { AgentToolRuntime } from './agent-tool-runtime.js';

type AgentRuntimeExecutorRequest = Parameters<AgentRuntimeExecutor>[0];
type ModelToolRequest = Extract<ModelOutcome, { readonly kind: 'tool-request' }>;

interface AgentModelToolContinuation {
  readonly kind: 'tool-result';
  readonly request: AgentRuntimeExecutorRequest;
  readonly toolRequest: ModelToolRequest;
  readonly toolResult: ToolRuntimeResult;
}

export function createAgentModelToolRuntimeExecutor(options: {
  readonly modelRuntime: ModelRuntime;
  readonly agentToolRuntime: AgentToolRuntime;
  readonly resolveModelId: AgentModelIdResolver;
}): AgentRuntimeExecutor {
  const { modelRuntime, agentToolRuntime, resolveModelId } = options;

  return async (request) => {
    const modelId = await resolveModelId(request);
    const initialResult = await modelRuntime.run({ modelId, input: request });
    const initialOutcome = parseModelOutcome(initialResult.output);

    if (initialOutcome.kind === 'final') {
      return initialOutcome.output;
    }

    const toolResult = await agentToolRuntime.run({
      agentId: request.agent.id,
      toolId: initialOutcome.toolId,
      input: initialOutcome.input,
    });
    const continuation: AgentModelToolContinuation = Object.freeze({
      kind: 'tool-result',
      request,
      toolRequest: initialOutcome,
      toolResult,
    });
    const continuedResult = await modelRuntime.run({ modelId, input: continuation });
    const continuedOutcome = parseModelOutcome(continuedResult.output);

    if (continuedOutcome.kind === 'tool-request') {
      throw new AgentToolTurnLimitExceededError(request.agent.id, continuedOutcome.toolId);
    }

    return continuedOutcome.output;
  };
}
