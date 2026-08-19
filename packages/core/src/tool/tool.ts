import type { z } from 'zod';

export type ToolRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly inputSchema: TSchema;
}
