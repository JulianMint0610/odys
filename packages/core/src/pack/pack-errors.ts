export class InvalidPackManifestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPackManifestError';
  }
}

export class DuplicatePackIdError extends Error {
  public constructor(packId: string) {
    super(`Pack with id "${packId}" is already registered`);
    this.name = 'DuplicatePackIdError';
  }
}
