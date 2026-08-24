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

export class AgentToolNotAllowedError extends Error {
  public readonly agentId: string;
  public readonly toolId: string;

  public constructor(agentId: string, toolId: string) {
    super(`Agent "${agentId}" does not declare Tool "${toolId}" in allowedTools.`);
    this.name = 'AgentToolNotAllowedError';
    this.agentId = agentId;
    this.toolId = toolId;
  }
}

export class InvalidAgentRuntimeRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidAgentRuntimeRequestError';
  }
}

export class InvalidAgentToolRuntimeRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidAgentToolRuntimeRequestError';
  }
}

export class UnknownAgentError extends Error {
  public constructor(agentId: string) {
    super(`Agent with id "${agentId}" is not registered`);
    this.name = 'UnknownAgentError';
  }
}
