export class InvalidModelDefinitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidModelDefinitionError';
  }
}

export class DuplicateModelIdError extends Error {
  public constructor(modelId: string) {
    super(`Model with id "${modelId}" is already registered`);
    this.name = 'DuplicateModelIdError';
  }
}

export class InvalidModelRuntimeRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidModelRuntimeRequestError';
  }
}

export class ModelOutcomeValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ModelOutcomeValidationError';
  }
}

export class UnknownModelError extends Error {
  public constructor(modelId: string) {
    super(`Model with id "${modelId}" is not registered`);
    this.name = 'UnknownModelError';
  }
}
