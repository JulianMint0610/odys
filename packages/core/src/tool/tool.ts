export type ToolRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly risk: ToolRisk;
}
