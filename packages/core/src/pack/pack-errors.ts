export class InvalidPackManifestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPackManifestError';
  }
}
