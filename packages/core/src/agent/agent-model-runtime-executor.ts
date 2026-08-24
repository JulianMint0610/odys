import type { ModelRuntime } from '../model/model-runtime.js';

import type { AgentRuntimeExecutor } from './agent-runtime.js';

export type AgentModelIdResolver = (
  request: Parameters<AgentRuntimeExecutor>[0],
) => Promise<string>;

export function createModelBackedAgentRuntimeExecutor(options: {
  readonly modelRuntime: ModelRuntime;
  readonly resolveModelId: AgentModelIdResolver;
}): AgentRuntimeExecutor {
  const { modelRuntime, resolveModelId } = options;

  return async (request) => {
    const modelId = await resolveModelId(request);

    return modelRuntime.run({
      modelId,
      input: request,
    });
  };
}
