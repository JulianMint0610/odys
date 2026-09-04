import { isCanonicalToolId } from '../tool/tool-id.js';

import { InvalidModelResponseError } from './model-errors.js';

export type ModelFinishReason = 'stop' | 'tool-request' | 'length' | 'other';

export interface ModelResponseToolRequest {
  readonly toolId: string;
  readonly input: unknown;
}

export interface ModelResponse {
  readonly content: unknown | undefined;
  readonly structuredOutput: unknown | undefined;
  readonly toolRequests: readonly ModelResponseToolRequest[];
  readonly finishReason: ModelFinishReason;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidResponse(message: string): never {
  throw new InvalidModelResponseError(`Invalid Model response: ${message}`);
}

function isModelFinishReason(value: unknown): value is ModelFinishReason {
  return value === 'stop' || value === 'tool-request' || value === 'length' || value === 'other';
}

function createToolRequest(value: unknown, index: number): ModelResponseToolRequest {
  if (!isRecord(value)) {
    rejectInvalidResponse(`toolRequests[${index}] must be an object`);
  }

  if (!Object.hasOwn(value, 'toolId')) {
    rejectInvalidResponse(`toolRequests[${index}].toolId must be provided`);
  }

  if (!isCanonicalToolId(value.toolId)) {
    rejectInvalidResponse(`toolRequests[${index}].toolId must be a canonical Tool identifier`);
  }

  if (!Object.hasOwn(value, 'input')) {
    rejectInvalidResponse(`toolRequests[${index}].input must be provided`);
  }

  return Object.freeze({
    toolId: value.toolId,
    input: value.input,
  });
}

export function createModelResponse(options: ModelResponse): ModelResponse {
  if (!isRecord(options)) {
    rejectInvalidResponse('options must be an object');
  }

  if (!Object.hasOwn(options, 'content')) {
    rejectInvalidResponse('content must be provided');
  }

  if (!Object.hasOwn(options, 'structuredOutput')) {
    rejectInvalidResponse('structuredOutput must be provided');
  }

  if (!Object.hasOwn(options, 'toolRequests')) {
    rejectInvalidResponse('toolRequests must be provided');
  }

  if (!Array.isArray(options.toolRequests)) {
    rejectInvalidResponse('toolRequests must be an array');
  }

  const toolRequests: ModelResponseToolRequest[] = [];
  let index = 0;

  for (const toolRequest of options.toolRequests) {
    toolRequests.push(createToolRequest(toolRequest, index));
    index += 1;
  }

  Object.freeze(toolRequests);

  if (!Object.hasOwn(options, 'finishReason')) {
    rejectInvalidResponse('finishReason must be provided');
  }

  if (!isModelFinishReason(options.finishReason)) {
    rejectInvalidResponse('finishReason must be "stop", "tool-request", "length", or "other"');
  }

  if (options.finishReason === 'tool-request' && toolRequests.length === 0) {
    rejectInvalidResponse('finishReason "tool-request" requires at least one Tool request');
  }

  if (options.finishReason !== 'tool-request' && toolRequests.length > 0) {
    rejectInvalidResponse('Tool requests require finishReason "tool-request"');
  }

  return Object.freeze({
    content: options.content,
    structuredOutput: options.structuredOutput,
    toolRequests,
    finishReason: options.finishReason,
  });
}
