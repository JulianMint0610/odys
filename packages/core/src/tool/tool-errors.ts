export class InvalidToolDefinitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidToolDefinitionError';
  }
}

export class DuplicateToolIdError extends Error {
  public constructor(toolId: string) {
    super(`Tool with id "${toolId}" is already registered`);
    this.name = 'DuplicateToolIdError';
  }
}

export class ToolInputValidationError extends Error {
  public readonly toolId: string;

  public constructor(toolId: string, cause: unknown) {
    super(`Invalid input for Tool "${toolId}".`, { cause });
    this.name = 'ToolInputValidationError';
    this.toolId = toolId;
  }
}
