import {
  InvalidToolRuntimePermissionResolutionError,
  InvalidToolRuntimeRequestError,
  UnknownToolError,
} from './tool-errors.js';
import { isCanonicalToolId } from './tool-id.js';
import { parseToolInput } from './tool-input.js';
import { parseToolOutput } from './tool-output.js';
import { assertToolPermissionRequirements } from './tool-permission.js';
import type { ToolRegistry } from './tool-registry.js';
import type { ToolDefinition } from './tool.js';

export interface ToolRuntimeRequest {
  readonly toolId: string;
  readonly input: unknown;
}

export interface ToolRuntimeResult {
  readonly toolId: string;
  readonly output: unknown;
}

export type ToolRuntimePermissionIdentifierResolver = (request: {
  readonly tool: ToolDefinition;
  readonly input: unknown;
}) => Promise<readonly string[]>;

export type ToolRuntimeExecutor = (request: {
  readonly tool: ToolDefinition;
  readonly input: unknown;
}) => Promise<unknown>;

export interface ToolRuntime {
  run(request: ToolRuntimeRequest): Promise<ToolRuntimeResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidRequest(message: string): never {
  throw new InvalidToolRuntimeRequestError(`Invalid Tool runtime request: ${message}`);
}

function validateToolRuntimeRequest(request: unknown): asserts request is ToolRuntimeRequest {
  if (!isRecord(request)) {
    rejectInvalidRequest('request must be an object');
  }

  if (!isCanonicalToolId(request.toolId)) {
    rejectInvalidRequest('toolId must be a canonical Tool identifier');
  }

  if (!Object.hasOwn(request, 'input')) {
    rejectInvalidRequest('input must be provided');
  }
}

function validatePermissionIdentifierResolution(
  toolId: string,
  value: unknown,
): asserts value is readonly string[] {
  if (!Array.isArray(value) || !value.every((permissionId) => typeof permissionId === 'string')) {
    throw new InvalidToolRuntimePermissionResolutionError(toolId);
  }
}

class CoreToolRuntime implements ToolRuntime {
  readonly #toolRegistry: ToolRegistry;
  readonly #resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver;
  readonly #executor: ToolRuntimeExecutor;

  public constructor(
    toolRegistry: ToolRegistry,
    resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver,
    executor: ToolRuntimeExecutor,
  ) {
    this.#toolRegistry = toolRegistry;
    this.#resolvePermissionIdentifiers = resolvePermissionIdentifiers;
    this.#executor = executor;
  }

  public async run(request: ToolRuntimeRequest): Promise<ToolRuntimeResult> {
    validateToolRuntimeRequest(request);

    const tool = this.#toolRegistry.get(request.toolId);

    if (tool === undefined) {
      throw new UnknownToolError(request.toolId);
    }

    const input: unknown = parseToolInput(tool, request.input);

    if (tool.requiredPermissions.length > 0) {
      const resolvedPermissionIdentifiers: unknown = await this.#resolvePermissionIdentifiers({
        tool,
        input,
      });

      validatePermissionIdentifierResolution(tool.id, resolvedPermissionIdentifiers);
      assertToolPermissionRequirements(tool, resolvedPermissionIdentifiers);
    }

    const rawOutput = await this.#executor({ tool, input });
    const output: unknown = parseToolOutput(tool, rawOutput);

    return {
      toolId: tool.id,
      output,
    };
  }
}

export function createToolRuntime(options: {
  readonly toolRegistry: ToolRegistry;
  readonly resolvePermissionIdentifiers: ToolRuntimePermissionIdentifierResolver;
  readonly executor: ToolRuntimeExecutor;
}): ToolRuntime {
  return new CoreToolRuntime(
    options.toolRegistry,
    options.resolvePermissionIdentifiers,
    options.executor,
  );
}
