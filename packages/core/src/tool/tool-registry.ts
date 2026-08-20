import type { z } from 'zod';

import { defineTool } from './define-tool.js';
import { DuplicateToolIdError } from './tool-errors.js';
import type { ToolDefinition } from './tool.js';

export interface ToolRegistry {
  register<TInputSchema extends z.ZodType = z.ZodType, TOutputSchema extends z.ZodType = z.ZodType>(
    tool: ToolDefinition<TInputSchema, TOutputSchema>,
  ): ToolDefinition<TInputSchema, TOutputSchema>;
  get(toolId: string): ToolDefinition | undefined;
  has(toolId: string): boolean;
  list(): readonly ToolDefinition[];
}

class CoreToolRegistry implements ToolRegistry {
  readonly #tools = new Map<string, ToolDefinition>();

  public register<
    TInputSchema extends z.ZodType = z.ZodType,
    TOutputSchema extends z.ZodType = z.ZodType,
  >(
    tool: ToolDefinition<TInputSchema, TOutputSchema>,
  ): ToolDefinition<TInputSchema, TOutputSchema> {
    const validTool = defineTool(tool);
    const { id } = validTool;

    if (this.#tools.has(id)) {
      throw new DuplicateToolIdError(id);
    }

    const requiredPermissions = Object.freeze([...validTool.requiredPermissions]);
    const registeredTool = Object.freeze({
      id: validTool.id,
      name: validTool.name,
      description: validTool.description,
      risk: validTool.risk,
      inputSchema: validTool.inputSchema,
      outputSchema: validTool.outputSchema,
      requiredPermissions,
    });

    this.#tools.set(id, registeredTool);
    return registeredTool;
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
