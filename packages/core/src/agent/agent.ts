export interface AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly responsibility: string;
  readonly allowedTools: readonly string[];
}
