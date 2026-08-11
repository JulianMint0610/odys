import { createPackRegistry, type PackDefinition } from '@odys/core';
import { describe, expect, it } from 'vitest';

import { engineeringPack } from './index.js';

describe('Engineering Pack', () => {
  it('satisfies the Core public Pack contract', () => {
    const packDefinition: PackDefinition = engineeringPack;

    expect(packDefinition.manifest).toEqual({
      id: 'engineering',
      name: 'Engineering Pack',
      version: '0.1.0',
      description: 'Engineering domain capabilities for ODYS.',
    });
  });

  it('registers and resolves through the Core public Pack Registry', () => {
    const registry = createPackRegistry();

    registry.register(engineeringPack);

    expect(registry.get('engineering')).toBe(engineeringPack);
    expect(registry.list()).toEqual([engineeringPack]);
  });
});
