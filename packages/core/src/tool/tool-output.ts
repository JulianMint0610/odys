import type { z } from 'zod';

import { ToolOutputValidationError } from './tool-errors.js';
import type { ToolDefinition } from './tool.js';

export function parseToolOutput<TOutputSchema extends z.ZodType>(
  toolDefinition: ToolDefinition<z.ZodType, TOutputSchema>,
  output: unknown,
): z.output<TOutputSchema> {
  const result = toolDefinition.outputSchema.safeParse(output);

  if (!result.success) {
    throw new ToolOutputValidationError(toolDefinition.id, result.error);
  }

  return result.data;
}
