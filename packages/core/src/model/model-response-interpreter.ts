import { ModelResponseInterpretationError } from './model-errors.js';
import { parseModelOutcome, type ModelOutcome } from './model-outcome.js';
import type { ModelResponse } from './model-response.js';

export function interpretModelResponse(response: ModelResponse): ModelOutcome {
  if (response.finishReason === 'stop') {
    return parseModelOutcome({ kind: 'final', output: response });
  }

  if (response.finishReason === 'tool-request') {
    const toolRequest = response.toolRequests[0];
    if (response.toolRequests.length !== 1 || toolRequest === undefined) {
      throw new ModelResponseInterpretationError(
        `Cannot interpret ModelResponse with ${response.toolRequests.length} Tool requests`,
      );
    }

    return parseModelOutcome({
      kind: 'tool-request',
      toolId: toolRequest.toolId,
      input: toolRequest.input,
    });
  }

  throw new ModelResponseInterpretationError(
    `Cannot interpret ModelResponse with finish reason "${response.finishReason}"`,
  );
}
