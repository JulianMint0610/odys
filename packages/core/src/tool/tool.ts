import type { z } from 'zod';

export type ToolRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ToolDefinition<
  TInputSchema extends z.ZodType = z.ZodType,
  TOutputSchema extends z.ZodType = z.ZodType,
> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly inputSchema: TInputSchema;
  readonly outputSchema: TOutputSchema;
  readonly requiredPermissions: readonly string[];
}
