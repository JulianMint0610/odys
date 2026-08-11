import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const repositoryRoot = new URL('../', import.meta.url);
const packRoot = new URL('packs/engineering/', repositoryRoot);
const coreRoot = new URL('packages/core/', repositoryRoot);

function readSourceTree(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryUrl = new URL(entry.name, directory);

      if (entry.isDirectory()) {
        return readSourceTree(new URL(`${entry.name}/`, directory));
      }

      return entry.name.endsWith('.ts') || entry.name.endsWith('.mjs')
        ? [readFileSync(entryUrl, 'utf8')]
        : [];
    })
    .join('\n');
}

function findImportSpecifiers(source) {
  return [...source.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/gu)].map(
    (match) => match[1],
  );
}

describe('Core and Engineering Pack package boundary', () => {
  it('declares the allowed Engineering Pack to Core dependency direction', () => {
    const packPackage = JSON.parse(readFileSync(new URL('package.json', packRoot), 'utf8'));
    const corePackage = JSON.parse(readFileSync(new URL('package.json', coreRoot), 'utf8'));

    expect(packPackage.dependencies).toEqual({ '@odys/core': 'workspace:*' });
    expect(corePackage.dependencies ?? {}).not.toHaveProperty('@odys/engineering-pack');
  });

  it('uses the Core public package entry point without private or reverse source imports', () => {
    const packImports = findImportSpecifiers(readSourceTree(new URL('src/', packRoot)));
    const coreImports = findImportSpecifiers(readSourceTree(new URL('src/', coreRoot)));

    expect(packImports).toContain('@odys/core');
    expect(packImports.some((specifier) => specifier.startsWith('@odys/core/'))).toBe(false);
    expect(packImports.some((specifier) => specifier.includes('packages/core/src'))).toBe(false);
    expect(coreImports).not.toContain('@odys/engineering-pack');
    expect(coreImports.some((specifier) => specifier.includes('packs/engineering'))).toBe(false);
  });
});
