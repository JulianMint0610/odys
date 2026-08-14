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
