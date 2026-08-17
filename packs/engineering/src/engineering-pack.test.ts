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
    const registeredEngineeringPack = registry.get('engineering');

    expect(registeredEngineeringPack).toEqual(engineeringPack);
    expect(registeredEngineeringPack).not.toBe(engineeringPack);
    expect(registeredEngineeringPack?.manifest).not.toBe(engineeringPack.manifest);
    expect(Object.isFrozen(registeredEngineeringPack)).toBe(true);
    expect(Object.isFrozen(registeredEngineeringPack?.manifest)).toBe(true);
    expect(Object.isFrozen(engineeringPack)).toBe(false);
    expect(Object.isFrozen(engineeringPack.manifest)).toBe(false);
    expect(registry.list()).toEqual([registeredEngineeringPack]);
    expect(registry.list()[0]).toBe(registeredEngineeringPack);
  });
});
