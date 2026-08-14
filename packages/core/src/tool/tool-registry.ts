import { defineTool } from './define-tool.js';
import { DuplicateToolIdError } from './tool-errors.js';
import type { ToolDefinition } from './tool.js';

export interface ToolRegistry {
  register(tool: ToolDefinition): ToolDefinition;
  get(toolId: string): ToolDefinition | undefined;
  has(toolId: string): boolean;
  list(): readonly ToolDefinition[];
}

class CoreToolRegistry implements ToolRegistry {
  readonly #tools = new Map<string, ToolDefinition>();

  public register(tool: ToolDefinition): ToolDefinition {
    const validTool = defineTool(tool);
    const { id } = validTool;

    if (this.#tools.has(id)) {
      throw new DuplicateToolIdError(id);
    }

    this.#tools.set(id, validTool);
    return validTool;
  }

  public get(toolId: string): ToolDefinition | undefined {
    return this.#tools.get(toolId);
  }

  public has(toolId: string): boolean {
    return this.#tools.has(toolId);
  }

  public list(): readonly ToolDefinition[] {
    return Object.freeze([...this.#tools.values()]);
  }
}

export function createToolRegistry(): ToolRegistry {
  return new CoreToolRegistry();
}
