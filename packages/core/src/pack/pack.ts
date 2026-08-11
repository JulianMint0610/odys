export interface PackManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
}

export interface PackDefinition {
  readonly manifest: PackManifest;
}
