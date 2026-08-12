import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const packsRoot = join(repositoryRoot, 'packs');
const coreRoot = join(repositoryRoot, 'packages', 'core');
const coreSourceRoot = join(coreRoot, 'src');
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredSourceDirectories = new Set(['dist', 'node_modules']);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function sourceExtension(filePath) {
  const match = /\.[^.]+$/u.exec(filePath);
  return match?.[0] ?? '';
}

function isSupportedSourceFile(filePath) {
  return sourceExtensions.has(sourceExtension(filePath));
}

function scriptKindFor(filePath) {
  switch (sourceExtension(filePath)) {
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.json':
      return ts.ScriptKind.JSON;
    default:
      return ts.ScriptKind.TS;
  }
}

function findModuleSpecifiers(source, filePath = 'fixture.ts') {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath),
  );
  const specifiers = [];

  function addStringLiteral(node) {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.push(node.text);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addStringLiteral(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const isRequireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;

      if (isRequireCall || isDynamicImport) {
        addStringLiteral(node.arguments[0]);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function readSourceModules(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredSourceDirectories.has(entry.name) ? [] : readSourceModules(entryPath);
    }

    if (!entry.isFile() || !isSupportedSourceFile(entry.name)) {
      return [];
    }

    return [
      {
        filePath: entryPath,
        specifiers: findModuleSpecifiers(readFileSync(entryPath, 'utf8'), entryPath),
      },
    ];
  });
}

function discoverPackWorkspaces() {
  return readdirSync(packsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const root = join(packsRoot, entry.name);
      const packagePath = join(root, 'package.json');

      return { directoryName: entry.name, packagePath, root };
    })
    .filter(({ packagePath }) => existsSync(packagePath))
    .map((pack) => {
      const packageJson = readJson(pack.packagePath);

      if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
        throw new Error(`Pack workspace ${pack.directoryName} must declare a package name`);
      }

      return {
        ...pack,
        packageJson,
        packageName: packageJson.name,
        sourceModules: readSourceModules(join(pack.root, 'src')),
      };
    });
}

function flattenModuleReferences(sourceModules) {
  return sourceModules.flatMap(({ filePath, specifiers }) =>
    specifiers.map((specifier) => ({ filePath, specifier })),
  );
}

function isWithinPath(candidate, parent) {
  const pathFromParent = relative(parent, candidate);
  return (
    pathFromParent === '' ||
    (pathFromParent !== '..' &&
      !pathFromParent.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromParent))
  );
}

function resolvesWithin(importerPath, specifier, targetRoot) {
  return (
    specifier.startsWith('.') && isWithinPath(resolve(dirname(importerPath), specifier), targetRoot)
  );
}

function referencesRepositoryPath(specifier, repositoryPath) {
  const normalizedSpecifier = specifier.replaceAll('\\', '/');
  const normalizedPath = relative(repositoryRoot, repositoryPath).replaceAll('\\', '/');
  return (
    normalizedSpecifier === normalizedPath ||
    normalizedSpecifier.startsWith(`${normalizedPath}/`) ||
    normalizedSpecifier.includes(`/${normalizedPath}/`)
  );
}

function findPackToCoreViolations(moduleReferences) {
  return moduleReferences.filter(
    ({ filePath, specifier }) =>
      specifier.startsWith('@odys/core/') ||
      resolvesWithin(filePath, specifier, coreRoot) ||
      referencesRepositoryPath(specifier, coreRoot),
  );
}

function findCoreToPackViolations(moduleReferences, packs) {
  return moduleReferences.filter(({ filePath, specifier }) =>
    packs.some(
      (pack) =>
        specifier === pack.packageName ||
        specifier.startsWith(`${pack.packageName}/`) ||
        resolvesWithin(filePath, specifier, pack.root) ||
        referencesRepositoryPath(specifier, pack.root),
    ),
  );
}

function runtimeDependencies(packageJson) {
  return {
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies,
    ...packageJson.peerDependencies,
  };
}

const rootPackage = readJson(join(repositoryRoot, 'package.json'));
const corePackage = readJson(join(coreRoot, 'package.json'));
const packWorkspaces = discoverPackWorkspaces();
const coreSourceModules = readSourceModules(coreSourceRoot);
const coreModuleReferences = flattenModuleReferences(coreSourceModules);

describe('repository architecture test execution', () => {
  it('is explicitly scoped to repository tests and fails when no tests are discovered', () => {
    const testScript = rootPackage.scripts?.test;
    const testScriptTokens = testScript?.split(/\s+/u) ?? [];
    const directoryFlagIndex = testScriptTokens.indexOf('--dir');

    expect(directoryFlagIndex).toBeGreaterThan(-1);
    expect(testScriptTokens[directoryFlagIndex + 1]).toBe('tests');
    expect(testScript).not.toContain('--passWithNoTests');
  });
});

describe('module specifier scanner', () => {
  it('supports the JavaScript and TypeScript source variants used by workspace packages', () => {
    expect(
      [
        'index.ts',
        'index.tsx',
        'index.mts',
        'index.cts',
        'index.js',
        'index.jsx',
        'index.mjs',
        'index.cjs',
      ].every(isSupportedSourceFile),
    ).toBe(true);
    expect(isSupportedSourceFile('package.json')).toBe(false);
  });

  it('extracts static, side-effect, export-from, require, and dynamic import specifiers', () => {
    const source = `
      import { normal } from '@fixture/normal';
      import '@fixture/side-effect';
      export { named } from '@fixture/named-export';
      export * from '@fixture/star-export';
      import legacy = require('@fixture/import-equals');
      const required = require('@fixture/required');
      const lazy = import('@fixture/dynamic');

      // import '@fake/line-comment';
      /* export * from '@fake/block-comment'; */
      const ordinaryString = "require('@fake/string')";
      describe("import fake from '@fake/test-description'", () => undefined);
    `;

    expect(findModuleSpecifiers(source)).toEqual([
      '@fixture/normal',
      '@fixture/side-effect',
      '@fixture/named-export',
      '@fixture/star-export',
      '@fixture/import-equals',
      '@fixture/required',
      '@fixture/dynamic',
    ]);
  });

  it('classifies Pack deep imports and relative Core reaches as violations', () => {
    const syntheticPackFile = join(packsRoot, 'synthetic', 'src', 'index.ts');
    const moduleReferences = [
      { filePath: syntheticPackFile, specifier: '@odys/core' },
      { filePath: syntheticPackFile, specifier: '@odys/core/private' },
      { filePath: syntheticPackFile, specifier: '../../../packages/core/src/pack/pack.js' },
      { filePath: syntheticPackFile, specifier: 'packages/core/src/pack/pack.js' },
    ];

    expect(findPackToCoreViolations(moduleReferences).map(({ specifier }) => specifier)).toEqual([
      '@odys/core/private',
      '../../../packages/core/src/pack/pack.js',
      'packages/core/src/pack/pack.js',
    ]);
  });

  it('classifies Core imports of Pack entries, subpaths, and relative sources as violations', () => {
    const syntheticCoreFile = join(coreSourceRoot, 'index.ts');
    const syntheticPack = {
      packageName: '@odys/synthetic-pack',
      root: join(packsRoot, 'synthetic'),
    };
    const moduleReferences = [
      { filePath: syntheticCoreFile, specifier: '@odys/synthetic-pack' },
      { filePath: syntheticCoreFile, specifier: '@odys/synthetic-pack/private' },
      { filePath: syntheticCoreFile, specifier: '../../../packs/synthetic/src/index.js' },
      { filePath: syntheticCoreFile, specifier: 'packs/synthetic/src/index.js' },
    ];

    expect(
      findCoreToPackViolations(moduleReferences, [syntheticPack]).map(({ specifier }) => specifier),
    ).toEqual(moduleReferences.map(({ specifier }) => specifier));
  });
});

describe('Core and Pack workspace boundary', () => {
  it('discovers current Pack packages from the packs workspace directory', () => {
    expect(packWorkspaces.length).toBeGreaterThan(0);
    expect(packWorkspaces.every(({ root }) => dirname(root) === packsRoot)).toBe(true);
  });

  describe.each(packWorkspaces)('$packageName', (pack) => {
    it('declares the required workspace dependency on the Core public package', () => {
      expect(runtimeDependencies(pack.packageJson)['@odys/core']).toBe('workspace:*');
    });

    it('has no external runtime dependencies under the current foundation policy', () => {
      const externalDependencies = Object.fromEntries(
        Object.entries(runtimeDependencies(pack.packageJson)).filter(
          ([name]) => name !== '@odys/core',
        ),
      );

      expect(externalDependencies).toEqual({});
    });

    it('uses the Core public entry point without reaching through to Core internals', () => {
      const moduleReferences = flattenModuleReferences(pack.sourceModules);

      expect(moduleReferences.map(({ specifier }) => specifier)).toContain('@odys/core');
      expect(findPackToCoreViolations(moduleReferences)).toEqual([]);
    });
  });

  it('keeps Core package metadata independent of every discovered Pack', () => {
    const declaredCoreDependencies = {
      ...corePackage.dependencies,
      ...corePackage.optionalDependencies,
      ...corePackage.peerDependencies,
    };

    for (const { packageName } of packWorkspaces) {
      expect(declaredCoreDependencies).not.toHaveProperty(packageName);
    }
  });

  it('keeps Core source independent of Pack package entries, subpaths, and implementation paths', () => {
    expect(coreSourceModules.length).toBeGreaterThan(0);
    expect(findCoreToPackViolations(coreModuleReferences, packWorkspaces)).toEqual([]);
  });
});
