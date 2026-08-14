export class InvalidAgentDefinitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidAgentDefinitionError';
  }
}

export class DuplicateAgentIdError extends Error {
  public constructor(agentId: string) {
    super(`Agent with id "${agentId}" is already registered`);
    this.name = 'DuplicateAgentIdError';
  }
}

export class InvalidAgentRuntimeRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidAgentRuntimeRequestError';
  }
}

export class UnknownAgentError extends Error {
  public constructor(agentId: string) {
    super(`Agent with id "${agentId}" is not registered`);
    this.name = 'UnknownAgentError';
  }
}
