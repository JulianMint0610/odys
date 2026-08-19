import { describe, expect, it } from 'vitest';

import {
  createPackRegistry,
  definePack,
  DuplicatePackIdError,
  InvalidPackManifestError,
  type PackDefinition,
} from '../index.js';

function createTestPack(id: string): PackDefinition {
  return definePack({
    manifest: {
      id,
      name: `${id} Pack`,
      version: '0.1.0',
      description: `Fixture for ${id}.`,
    },
  });
}

describe('Pack Registry', () => {
  it('registers a valid Pack as a Registry-owned immutable snapshot and returns void', () => {
    const registry = createPackRegistry();
    const pack = createTestPack('engineering');

    const registrationResult = registry.register(pack);
    const registeredPack = registry.get('engineering');

    expect(registrationResult).toBeUndefined();
    expect(registeredPack).toEqual(pack);
    expect(registeredPack).not.toBe(pack);
    expect(registeredPack?.manifest).not.toBe(pack.manifest);
    expect(Object.isFrozen(registeredPack)).toBe(true);
    expect(Object.isFrozen(registeredPack?.manifest)).toBe(true);
    expect(Object.isFrozen(pack)).toBe(false);
    expect(Object.isFrozen(pack.manifest)).toBe(false);
    expect(registry.has('engineering')).toBe(true);
  });

  it('retrieves the same canonical Pack snapshot by its stable ID', () => {
    const registry = createPackRegistry();
    const engineeringPack = createTestPack('engineering');

    registry.register(engineeringPack);
    const registeredPack = registry.get('engineering');

    expect(registeredPack).not.toBe(engineeringPack);
    expect(registry.get('engineering')).toBe(registeredPack);
  });

  it('preserves an omitted optional description in the canonical snapshot', () => {
    const registry = createPackRegistry();
    const pack = definePack({
      manifest: {
        id: 'engineering',
        name: 'Engineering Pack',
        version: '0.1.0',
      },
    });

    registry.register(pack);
    const registeredPack = registry.get('engineering');

    expect(registeredPack).toEqual(pack);
    expect(Object.hasOwn(registeredPack?.manifest ?? {}, 'description')).toBe(false);
  });

  it('reports an unknown Pack ID explicitly', () => {
    const registry = createPackRegistry();

    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists canonical Pack snapshots in registration order without exposing mutable Registry state', () => {
    const registry = createPackRegistry();
    const engineeringPack = createTestPack('engineering');
    const researchPack = createTestPack('research');

    registry.register(engineeringPack);
    registry.register(researchPack);

    const listedPacks = registry.list();

    expect(listedPacks).toEqual([engineeringPack, researchPack]);
    expect(listedPacks[0]).toBe(registry.get('engineering'));
    expect(listedPacks[1]).toBe(registry.get('research'));
    expect(Object.isFrozen(listedPacks)).toBe(true);
    expect(listedPacks.every((pack) => Object.isFrozen(pack))).toBe(true);
    expect(listedPacks.every((pack) => Object.isFrozen(pack.manifest))).toBe(true);
    expect(registry.list()).not.toBe(listedPacks);
  });

  it('returns list snapshots that are not changed by later registrations', () => {
    const registry = createPackRegistry();
    const engineeringPack = createTestPack('engineering');

    registry.register(engineeringPack);
    const listedPacks = registry.list();
    registry.register(createTestPack('research'));

    expect(listedPacks).toEqual([engineeringPack]);
    expect(registry.list()).toHaveLength(2);
  });

  it('isolates registered state from caller mutation of nested manifest fields', () => {
    const registry = createPackRegistry();
    const pack = createTestPack('engineering');

    registry.register(pack);
    const registeredPack = registry.get('engineering');

    (pack.manifest as { name: string; version: string }).name = 'Caller-mutated Pack';
    (pack.manifest as { name: string; version: string }).version = '9.9.9';

    expect(pack.manifest.name).toBe('Caller-mutated Pack');
    expect(pack.manifest.version).toBe('9.9.9');
    expect(registry.get('engineering')).toBe(registeredPack);
    expect(registry.get('engineering')?.manifest.name).toBe('engineering Pack');
    expect(registry.get('engineering')?.manifest.version).toBe('0.1.0');
    expect(registry.list()).toEqual([registeredPack]);
  });

  it('does not allow mutation through the Registry-owned Pack or nested manifest snapshot', () => {
    const registry = createPackRegistry();

    registry.register(createTestPack('engineering'));
    const registeredPack = registry.get('engineering');
    const listedPack = registry.list()[0];

    expect(registeredPack).toBeDefined();
    expect(listedPack).toBe(registeredPack);
    expect(() => {
      (registeredPack as { manifest: PackDefinition['manifest'] }).manifest = {
        id: 'replacement',
        name: 'Replacement Pack',
        version: '9.9.9',
      };
    }).toThrow(TypeError);
    expect(() => {
      (registeredPack?.manifest as { name: string }).name = 'Mutated Pack';
    }).toThrow(TypeError);
    expect(() => {
      (registeredPack?.manifest as { version: string }).version = '9.9.9';
    }).toThrow(TypeError);
    expect(() => {
      (listedPack?.manifest as { name: string }).name = 'List-mutated Pack';
    }).toThrow(TypeError);
    expect(registry.get('engineering')).toBe(registeredPack);
    expect(registry.get('engineering')?.manifest).toEqual({
      id: 'engineering',
      name: 'engineering Pack',
      version: '0.1.0',
      description: 'Fixture for engineering.',
    });
  });

  it('rejects duplicate Pack IDs without replacing the first registration', () => {
    const registry = createPackRegistry();
    const firstPack = createTestPack('engineering');
    const duplicatePack = definePack({
      manifest: {
        ...firstPack.manifest,
        name: 'Replacement Engineering Pack',
      },
    });

    registry.register(firstPack);
    const registeredPack = registry.get('engineering');

    expect(() => registry.register(duplicatePack)).toThrow(DuplicatePackIdError);
    expect(() => registry.register(duplicatePack)).toThrow(
      'Pack with id "engineering" is already registered',
    );
    expect(registry.get('engineering')).toBe(registeredPack);
    expect(registry.get('engineering')?.manifest.name).toBe('engineering Pack');
    expect(registry.list()).toEqual([registeredPack]);
  });

  it('validates malformed duplicate data before checking duplicate IDs', () => {
    const registry = createPackRegistry();
    const firstPack = createTestPack('engineering');
    const malformedDuplicate = {
      manifest: { ...firstPack.manifest, name: '' },
    } as PackDefinition;

    registry.register(firstPack);
    const registeredPack = registry.get('engineering');

    expect(() => registry.register(malformedDuplicate)).toThrow(InvalidPackManifestError);
    expect(() => registry.register(malformedDuplicate)).not.toThrow(DuplicatePackIdError);
    expect(registry.get('engineering')).toBe(registeredPack);
  });

  it('does not alter existing Registry state after a failed invalid registration', () => {
    const registry = createPackRegistry();
    const engineeringPack = createTestPack('engineering');
    const invalidResearchPack = {
      manifest: {
        id: 'research',
        name: 'Research Pack',
        version: '',
      },
    } as PackDefinition;

    registry.register(engineeringPack);
    const registeredPack = registry.get('engineering');

    expect(() => registry.register(invalidResearchPack)).toThrow(InvalidPackManifestError);
    expect(registry.get('engineering')).toBe(registeredPack);
    expect(registry.has('research')).toBe(false);
    expect(registry.list()).toEqual([registeredPack]);
  });

  it('creates isolated Pack and manifest snapshots for the same caller-owned object', () => {
    const firstRegistry = createPackRegistry();
    const secondRegistry = createPackRegistry();
    const pack = createTestPack('engineering');

    firstRegistry.register(pack);
    secondRegistry.register(pack);
    const firstRegisteredPack = firstRegistry.get('engineering');
    const secondRegisteredPack = secondRegistry.get('engineering');

    expect(firstRegistry.has('engineering')).toBe(true);
    expect(secondRegistry.has('engineering')).toBe(true);
    expect(firstRegisteredPack).toEqual(pack);
    expect(secondRegisteredPack).toEqual(pack);
    expect(firstRegisteredPack).toEqual(secondRegisteredPack);
    expect(firstRegisteredPack).not.toBe(pack);
    expect(secondRegisteredPack).not.toBe(pack);
    expect(firstRegisteredPack).not.toBe(secondRegisteredPack);
    expect(firstRegisteredPack?.manifest).not.toBe(pack.manifest);
    expect(secondRegisteredPack?.manifest).not.toBe(pack.manifest);
    expect(firstRegisteredPack?.manifest).not.toBe(secondRegisteredPack?.manifest);

    (pack.manifest as { name: string; version: string }).name = 'Caller-mutated Pack';
    (pack.manifest as { name: string; version: string }).version = '9.9.9';

    expect(firstRegistry.get('engineering')).toBe(firstRegisteredPack);
    expect(secondRegistry.get('engineering')).toBe(secondRegisteredPack);
    expect(firstRegistry.get('engineering')?.manifest.name).toBe('engineering Pack');
    expect(firstRegistry.get('engineering')?.manifest.version).toBe('0.1.0');
    expect(secondRegistry.get('engineering')?.manifest.name).toBe('engineering Pack');
    expect(secondRegistry.get('engineering')?.manifest.version).toBe('0.1.0');
  });

  it('keeps separate Registry containers independent', () => {
    const firstRegistry = createPackRegistry();
    const secondRegistry = createPackRegistry();

    firstRegistry.register(createTestPack('engineering'));

    expect(firstRegistry.has('engineering')).toBe(true);
    expect(secondRegistry.has('engineering')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });
});
