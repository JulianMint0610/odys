import type { z } from 'zod';

import { ToolInputValidationError } from './tool-errors.js';
import type { ToolDefinition } from './tool.js';

export function parseToolInput<TSchema extends z.ZodType>(
  toolDefinition: ToolDefinition<TSchema>,
  input: unknown,
): z.output<TSchema> {
  const result = toolDefinition.inputSchema.safeParse(input);

  if (!result.success) {
    throw new ToolInputValidationError(toolDefinition.id, result.error);
  }

  return result.data;
}
