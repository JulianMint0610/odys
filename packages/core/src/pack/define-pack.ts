import { InvalidPackManifestError } from './pack-errors.js';
import type { PackDefinition } from './pack.js';

const packIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectInvalidManifest(message: string): never {
  throw new InvalidPackManifestError(`Invalid Pack manifest: ${message}`);
}

function validatePackDefinition(definition: unknown): asserts definition is PackDefinition {
  if (!isRecord(definition)) {
    rejectInvalidManifest('definition must be an object');
  }

  const { manifest } = definition;

  if (!isRecord(manifest)) {
    rejectInvalidManifest('manifest must be an object');
  }

  if (typeof manifest.id !== 'string' || !packIdPattern.test(manifest.id)) {
    rejectInvalidManifest('manifest.id must be a canonical Pack identifier');
  }

  if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
    rejectInvalidManifest('manifest.name must be a non-empty string');
  }

  if (typeof manifest.version !== 'string' || manifest.version.trim().length === 0) {
    rejectInvalidManifest('manifest.version must be a non-empty string');
  }

  if (Object.hasOwn(manifest, 'description') && typeof manifest.description !== 'string') {
    rejectInvalidManifest('manifest.description must be a string when provided');
  }
}

export function definePack(definition: PackDefinition): PackDefinition {
  validatePackDefinition(definition);
  return definition;
}
