import { describe, expect, it } from 'vitest';

import {
  createPackRegistry,
  definePack,
  DuplicatePackIdError,
  type PackDefinition,
} from '../index.js';

function createTestPack(id: string): PackDefinition {
  return definePack({
    manifest: {
      id,
      name: `${id} Pack`,
      version: '0.1.0',
    },
  });
}

describe('Pack Registry', () => {
  it('registers a valid Pack', () => {
    const registry = createPackRegistry();

    registry.register(createTestPack('engineering'));

    expect(registry.has('engineering')).toBe(true);
  });

  it('retrieves a registered Pack by its stable ID', () => {
    const registry = createPackRegistry();
    const engineeringPack = createTestPack('engineering');

    registry.register(engineeringPack);

    expect(registry.get('engineering')).toBe(engineeringPack);
  });

  it('reports an unknown Pack ID explicitly', () => {
    const registry = createPackRegistry();

    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists registered Packs in registration order without exposing mutable Registry state', () => {
    const registry = createPackRegistry();
    const engineeringPack = createTestPack('engineering');
    const researchPack = createTestPack('research');

    registry.register(engineeringPack);
    registry.register(researchPack);

    const listedPacks = registry.list();

    expect(listedPacks).toEqual([engineeringPack, researchPack]);
    expect(Object.isFrozen(listedPacks)).toBe(true);
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

    expect(() => registry.register(duplicatePack)).toThrow(DuplicatePackIdError);
    expect(() => registry.register(duplicatePack)).toThrow(
      'Pack with id "engineering" is already registered',
    );
    expect(registry.get('engineering')).toBe(firstPack);
  });

  it('keeps separate Registry instances isolated', () => {
    const firstRegistry = createPackRegistry();
    const secondRegistry = createPackRegistry();

    firstRegistry.register(createTestPack('engineering'));

    expect(firstRegistry.has('engineering')).toBe(true);
    expect(secondRegistry.has('engineering')).toBe(false);
    expect(secondRegistry.list()).toEqual([]);
  });
});
