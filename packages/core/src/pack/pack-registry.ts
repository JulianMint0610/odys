import { definePack } from './define-pack.js';
import { DuplicatePackIdError } from './pack-errors.js';
import type { PackDefinition } from './pack.js';

export interface PackRegistry {
  register(pack: PackDefinition): void;
  get(packId: string): PackDefinition | undefined;
  has(packId: string): boolean;
  list(): readonly PackDefinition[];
}

class CorePackRegistry implements PackRegistry {
  readonly #packs = new Map<string, PackDefinition>();

  public register(pack: PackDefinition): void {
    const validPack = definePack(pack);
    const { id } = validPack.manifest;

    if (this.#packs.has(id)) {
      throw new DuplicatePackIdError(id);
    }

    this.#packs.set(id, validPack);
  }

  public get(packId: string): PackDefinition | undefined {
    return this.#packs.get(packId);
  }

  public has(packId: string): boolean {
    return this.#packs.has(packId);
  }

  public list(): readonly PackDefinition[] {
    return Object.freeze([...this.#packs.values()]);
  }
}

export function createPackRegistry(): PackRegistry {
  return new CorePackRegistry();
}
