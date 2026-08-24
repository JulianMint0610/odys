import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectRepositoryState,
  formatRepositoryState,
  parsePorcelainStatus,
  RepositoryStateError,
  runLocalGit,
} from '../scripts/repository-state.mjs';

const repositoryRoot = '/work/odys';
const headSha = '1111111111111111111111111111111111111111';
const mainSha = '2222222222222222222222222222222222222222';

function successful(stdout = '') {
  return { exitCode: 0, stderr: '', stdout };
}

function missing(stderr = '') {
  return { exitCode: 1, stderr, stdout: '' };
}

function commandKey(args) {
  return args.join('\0');
}

function createGitRunner(overrides = {}) {
  const responses = new Map(
    Object.entries({
      [commandKey(['rev-parse', '--show-toplevel'])]: successful(`${repositoryRoot}\n`),
      [commandKey(['symbolic-ref', '--quiet', '--short', 'HEAD'])]: successful('automation/001\n'),
      [commandKey(['rev-parse', '--verify', 'HEAD'])]: successful(`${headSha}\n`),
      [commandKey(['rev-parse', '--verify', '--quiet', 'refs/heads/main'])]: successful(
        `${mainSha}\n`,
      ),
      [commandKey([
        '--no-optional-locks',
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
      ])]: successful(''),
      [commandKey(['rev-list', '--left-right', '--count', 'refs/heads/main...HEAD'])]:
        successful('0\t0\n'),
      ...overrides,
    }),
  );
  const calls = [];

  return {
    calls,
    runGit(args, options) {
      calls.push({ args, options });
      const response = responses.get(commandKey(args));

      if (!response) {
        throw new Error(`Unexpected Git command: ${args.join(' ')}`);
      }

      return response;
    },
  };
}

describe('repository state collection', () => {
  it('collects a clean named branch and uses only the required local inspection commands', () => {
    const runner = createGitRunner();

    const state = collectRepositoryState(runner.runGit);

    expect(state).toEqual({
      aheadOfMain: 0,
      behindMain: 0,
      branch: 'automation/001',
      headSha,
      isDetachedHead: false,
      isWorkingTreeClean: true,
      localMainSha: mainSha,
      modifiedTrackedFiles: [],
      repositoryRoot,
      untrackedFiles: [],
    });
    expect(runner.calls.map(({ args }) => args)).toEqual([
      ['rev-parse', '--show-toplevel'],
      ['symbolic-ref', '--quiet', '--short', 'HEAD'],
      ['rev-parse', '--verify', 'HEAD'],
      ['rev-parse', '--verify', '--quiet', 'refs/heads/main'],
      ['--no-optional-locks', 'status', '--porcelain=v1', '-z', '--untracked-files=all'],
      ['rev-list', '--left-right', '--count', 'refs/heads/main...HEAD'],
    ]);
    expect(runner.calls.slice(1).every(({ options }) => options.cwd === repositoryRoot)).toBe(true);
  });

  it('represents detached HEAD explicitly', () => {
    const runner = createGitRunner({
      [commandKey(['symbolic-ref', '--quiet', '--short', 'HEAD'])]: missing(),
    });

    const state = collectRepositoryState(runner.runGit);

    expect(state.branch).toBeNull();
    expect(state.isDetachedHead).toBe(true);
    expect(formatRepositoryState(state)).toContain('Branch: (detached HEAD)');
  });

  it('reports modified tracked files, renames, and untracked files without sorting paths', () => {
    const status = [
      ' M tracked file.txt',
      'R  renamed file.txt',
      'original file.txt',
      '?? untracked file.txt',
      '',
    ].join('\0');
    const runner = createGitRunner({
      [commandKey([
        '--no-optional-locks',
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
      ])]: successful(status),
    });

    const state = collectRepositoryState(runner.runGit);

    expect(state.isWorkingTreeClean).toBe(false);
    expect(state.modifiedTrackedFiles).toEqual([
      { path: 'tracked file.txt', status: ' M' },
      { originalPath: 'original file.txt', path: 'renamed file.txt', status: 'R ' },
    ]);
    expect(state.untrackedFiles).toEqual(['untracked file.txt']);
    expect(formatRepositoryState(state)).toContain('  [R ] original file.txt -> renamed file.txt');
  });

  it.each([
    { description: 'ahead of main', expectedAhead: 3, expectedBehind: 0, output: '0 3\n' },
    { description: 'behind main', expectedAhead: 0, expectedBehind: 2, output: '2 0\n' },
  ])('reports a branch $description', ({ expectedAhead, expectedBehind, output }) => {
    const runner = createGitRunner({
      [commandKey(['rev-list', '--left-right', '--count', 'refs/heads/main...HEAD'])]:
        successful(output),
    });

    const state = collectRepositoryState(runner.runGit);

    expect(state.aheadOfMain).toBe(expectedAhead);
    expect(state.behindMain).toBe(expectedBehind);
  });

  it('represents a missing local main without attempting a comparison', () => {
    const runner = createGitRunner({
      [commandKey(['rev-parse', '--verify', '--quiet', 'refs/heads/main'])]: missing(),
    });

    const state = collectRepositoryState(runner.runGit);

    expect(state.localMainSha).toBeNull();
    expect(state.aheadOfMain).toBeNull();
    expect(state.behindMain).toBeNull();
    expect(runner.calls.map(({ args }) => args).some(([command]) => command === 'rev-list')).toBe(
      false,
    );
    expect(formatRepositoryState(state)).toContain(
      'Relation to local main: unavailable (local branch not found)',
    );
  });

  it('fails clearly when a required Git command fails', () => {
    const runner = createGitRunner({
      [commandKey(['rev-parse', '--show-toplevel'])]: {
        exitCode: 128,
        stderr: 'fatal: not a git repository\n',
        stdout: '',
      },
    });

    expect(() => collectRepositoryState(runner.runGit)).toThrowError(
      new RepositoryStateError(
        'Git command failed (git rev-parse --show-toplevel): fatal: not a git repository',
      ),
    );
  });

  it('rejects status output that cannot be parsed safely', () => {
    expect(() => parsePorcelainStatus(' M missing terminator')).toThrowError(
      'Git status output was not NUL-terminated',
    );
    expect(() => parsePorcelainStatus('broken\0')).toThrowError(
      'Git returned an invalid porcelain status record',
    );
  });

  it('accepts a tracked type change from porcelain v1 output', () => {
    expect(parsePorcelainStatus(' T type-changed-entry\0')).toEqual({
      modifiedTrackedFiles: [{ path: 'type-changed-entry', status: ' T' }],
      untrackedFiles: [],
    });
  });

  it('collects a real repository that has no local main branch', () => {
    const temporaryRepository = mkdtempSync(join(tmpdir(), 'odys-repository-state-'));

    function runFixtureGit(args) {
      const result = runLocalGit(args, { cwd: temporaryRepository });

      if (result.exitCode !== 0) {
        throw new Error(`Fixture Git command failed: git ${args.join(' ')}: ${result.stderr}`);
      }

      return result;
    }

    try {
      runFixtureGit(['init', '--initial-branch=review-fixture']);
      writeFileSync(join(temporaryRepository, 'fixture.txt'), 'fixture\n', 'utf8');
      runFixtureGit(['add', 'fixture.txt']);
      runFixtureGit([
        '-c',
        'user.name=ODYS Test',
        '-c',
        'user.email=odys-test@example.invalid',
        'commit',
        '-m',
        'create fixture',
      ]);

      const missingMain = runLocalGit(['rev-parse', '--verify', '--quiet', 'refs/heads/main'], {
        cwd: temporaryRepository,
      });
      expect(missingMain.exitCode).toBe(1);
      expect(missingMain.stdout).toBe('');

      let isFirstCollectorCommand = true;
      const runGitFromFixture = (args, options) => {
        const cwd = isFirstCollectorCommand ? temporaryRepository : options.cwd;
        isFirstCollectorCommand = false;
        return runLocalGit(args, { cwd });
      };

      const state = collectRepositoryState(runGitFromFixture);

      expect(state.branch).toBe('review-fixture');
      expect(state.localMainSha).toBeNull();
      expect(state.aheadOfMain).toBeNull();
      expect(state.behindMain).toBeNull();
    } finally {
      rmSync(temporaryRepository, { force: true, recursive: true });
    }
  });
});
