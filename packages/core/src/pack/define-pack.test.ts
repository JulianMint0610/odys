import { describe, expect, it } from 'vitest';

import {
  definePack,
  InvalidPackManifestError,
  type PackDefinition,
  type PackManifest,
} from '../index.js';

const validManifest: PackManifest = {
  id: 'study',
  name: 'Study Pack',
  version: '0.1.0',
};

function definitionWithManifest(manifest: unknown): PackDefinition {
  return { manifest } as PackDefinition;
}

describe('definePack', () => {
  it('defines a valid minimal Pack definition through the Core public entry point', () => {
    const definition: PackDefinition = definePack({ manifest: validManifest });

    expect(definition).toEqual({ manifest: validManifest });
  });

  it('allows an omitted description', () => {
    expect(() => definePack({ manifest: validManifest })).not.toThrow();
  });

  it('allows a string description', () => {
    const definition = definePack({
      manifest: {
        ...validManifest,
        description: 'Study domain Pack',
      },
    });

    expect(definition.manifest.description).toBe('Study domain Pack');
  });

  it.each(['study', 'research-tools', 'engineering2', 'study-v2'])(
    'allows the canonical Pack id %s',
    (id) => {
      expect(() =>
        definePack({
          manifest: {
            ...validManifest,
            id,
          },
        }),
      ).not.toThrow();
    },
  );

  it.each([
    ['', 'an empty id'],
    ['Study', 'an uppercase letter'],
    ['Study Pack', 'whitespace'],
    ['study_pack', 'an underscore'],
    ['-study', 'a leading hyphen'],
    ['study-', 'a trailing hyphen'],
    ['study--tools', 'a repeated hyphen'],
    [' study', 'leading whitespace'],
    ['study ', 'trailing whitespace'],
  ])('rejects Pack id %j containing %s', (id) => {
    expect(() =>
      definePack({
        manifest: {
          ...validManifest,
          id,
        },
      }),
    ).toThrow(InvalidPackManifestError);
  });

  it.each([
    ['', 'an empty string'],
    ['   ', 'only whitespace'],
  ])('rejects a name containing %s', (name) => {
    expect(() =>
      definePack({
        manifest: {
          ...validManifest,
          name,
        },
      }),
    ).toThrow(InvalidPackManifestError);
  });

  it.each([
    ['', 'an empty string'],
    ['   ', 'only whitespace'],
  ])('rejects a version containing %s', (version) => {
    expect(() =>
      definePack({
        manifest: {
          ...validManifest,
          version,
        },
      }),
    ).toThrow(InvalidPackManifestError);
  });

  it.each([
    { field: 'manifest.id', manifest: { ...validManifest, id: 1 } },
    { field: 'manifest.name', manifest: { ...validManifest, name: null } },
    { field: 'manifest.name', manifest: { ...validManifest, name: 1 } },
    { field: 'manifest.version', manifest: { ...validManifest, version: false } },
    { field: 'manifest.description', manifest: { ...validManifest, description: 1 } },
  ])('rejects an invalid runtime type for $field', ({ manifest }) => {
    expect(() => definePack(definitionWithManifest(manifest))).toThrow(InvalidPackManifestError);
  });

  it.each([null, 1, [], {}, { manifest: null }])(
    'rejects a malformed runtime definition without leaking an incidental TypeError',
    (definition) => {
      expect(() => definePack(definition as PackDefinition)).toThrow(InvalidPackManifestError);
    },
  );

  it('reports which manifest field failed validation', () => {
    expect(() =>
      definePack({
        manifest: {
          ...validManifest,
          id: 'Study',
        },
      }),
    ).toThrow('Invalid Pack manifest: manifest.id');
  });
});
