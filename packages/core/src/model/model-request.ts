import { isCanonicalToolId } from '../tool/tool-id.js';

import { InvalidModelRequestError } from './model-errors.js';
import type { ModelResponseToolRequest } from './model-response.js';

export type ModelRequestInputItem =
  | {
      readonly kind: 'message';
      readonly role: 'user' | 'assistant';
      readonly content: unknown;
    }
  | {
      readonly kind: 'tool-result';
      readonly toolRequest: ModelResponseToolRequest;
      readonly output: unknown;
    };

export interface ModelRequestTool {
  readonly id: string;
  readonly description?: string;
  readonly inputSchema: unknown;
}

export interface ModelRequest {
  readonly instructions: readonly string[];
  readonly input: readonly ModelRequestInputItem[];
  readonly tools: readonly ModelRequestTool[];
  readonly outputSchema?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidRequest(message: string): never {
  throw new InvalidModelRequestError(`Invalid Model request: ${message}`);
}

function validateToolRequest(
  value: unknown,
  index: number,
): asserts value is ModelResponseToolRequest {
  if (!isRecord(value)) {
    rejectInvalidRequest(`input[${index}].toolRequest must be an object`);
  }

  if (!Object.hasOwn(value, 'toolId')) {
    rejectInvalidRequest(`input[${index}].toolRequest.toolId must be provided`);
  }

  if (!isCanonicalToolId(value.toolId)) {
    rejectInvalidRequest(`input[${index}].toolRequest.toolId must be a canonical Tool identifier`);
  }

  if (!Object.hasOwn(value, 'input')) {
    rejectInvalidRequest(`input[${index}].toolRequest.input must be provided`);
  }
}

function createInputItem(value: unknown, index: number): ModelRequestInputItem {
  if (!isRecord(value)) {
    rejectInvalidRequest(`input[${index}] must be an object`);
  }

  if (!Object.hasOwn(value, 'kind')) {
    rejectInvalidRequest(`input[${index}].kind must be provided`);
  }

  if (value.kind !== 'message' && value.kind !== 'tool-result') {
    rejectInvalidRequest(`input[${index}].kind must be "message" or "tool-result"`);
  }

  if (value.kind === 'message') {
    if (!Object.hasOwn(value, 'role')) {
      rejectInvalidRequest(`input[${index}].role must be provided`);
    }

    if (value.role !== 'user' && value.role !== 'assistant') {
      rejectInvalidRequest(`input[${index}].role must be "user" or "assistant"`);
    }

    if (!Object.hasOwn(value, 'content')) {
      rejectInvalidRequest(`input[${index}].content must be provided`);
    }

    return Object.freeze({
      kind: 'message',
      role: value.role,
      content: value.content,
    });
  }

  if (!Object.hasOwn(value, 'toolRequest')) {
    rejectInvalidRequest(`input[${index}].toolRequest must be provided`);
  }

  const toolRequest = value.toolRequest;
  validateToolRequest(toolRequest, index);

  if (!Object.hasOwn(value, 'output')) {
    rejectInvalidRequest(`input[${index}].output must be provided`);
  }

  // The supplied Tool request remains a reference; only this input wrapper is Core-owned.
  return Object.freeze({
    kind: 'tool-result',
    toolRequest,
    output: value.output,
  });
}

function createTool(value: unknown, index: number): ModelRequestTool {
  if (!isRecord(value)) {
    rejectInvalidRequest(`tools[${index}] must be an object`);
  }

  if (!Object.hasOwn(value, 'id')) {
    rejectInvalidRequest(`tools[${index}].id must be provided`);
  }

  if (!isCanonicalToolId(value.id)) {
    rejectInvalidRequest(`tools[${index}].id must be a canonical Tool identifier`);
  }

  if (!Object.hasOwn(value, 'inputSchema')) {
    rejectInvalidRequest(`tools[${index}].inputSchema must be provided`);
  }

  if (Object.hasOwn(value, 'description')) {
    if (typeof value.description !== 'string' || value.description.trim().length === 0) {
      rejectInvalidRequest(`tools[${index}].description must be a non-empty string`);
    }

    return Object.freeze({
      id: value.id,
      description: value.description,
      inputSchema: value.inputSchema,
    });
  }

  return Object.freeze({
    id: value.id,
    inputSchema: value.inputSchema,
  });
}

export function createModelRequest(options: ModelRequest): ModelRequest {
  if (!isRecord(options)) {
    rejectInvalidRequest('options must be an object');
  }

  if (!Object.hasOwn(options, 'instructions')) {
    rejectInvalidRequest('instructions must be provided');
  }

  if (!Array.isArray(options.instructions)) {
    rejectInvalidRequest('instructions must be an array');
  }

  const instructions: string[] = [];
  let instructionIndex = 0;

  for (const instruction of options.instructions) {
    if (typeof instruction !== 'string') {
      rejectInvalidRequest(`instructions[${instructionIndex}] must be a string`);
    }

    instructions.push(instruction);
    instructionIndex += 1;
  }

  Object.freeze(instructions);

  if (!Object.hasOwn(options, 'input')) {
    rejectInvalidRequest('input must be provided');
  }

  if (!Array.isArray(options.input)) {
    rejectInvalidRequest('input must be an array');
  }

  const input: ModelRequestInputItem[] = [];
  let inputIndex = 0;

  for (const item of options.input) {
    input.push(createInputItem(item, inputIndex));
    inputIndex += 1;
  }

  Object.freeze(input);

  if (!Object.hasOwn(options, 'tools')) {
    rejectInvalidRequest('tools must be provided');
  }

  if (!Array.isArray(options.tools)) {
    rejectInvalidRequest('tools must be an array');
  }

  const tools: ModelRequestTool[] = [];
  const toolIds = new Set<string>();
  let toolIndex = 0;

  for (const value of options.tools) {
    const tool = createTool(value, toolIndex);

    if (toolIds.has(tool.id)) {
      rejectInvalidRequest(`tools[${toolIndex}].id must not duplicate an earlier Tool identifier`);
    }

    toolIds.add(tool.id);
    tools.push(tool);
    toolIndex += 1;
  }

  Object.freeze(tools);

  return Object.freeze({
    instructions,
    input,
    tools,
    ...(Object.hasOwn(options, 'outputSchema') ? { outputSchema: options.outputSchema } : {}),
  });
}
