import { describe, expect, it, vi } from 'vitest';

import { runDevPreflight } from '../scripts/dev-preflight.mjs';
import {
  evaluateRepositoryPreflight,
  formatRepositoryPreflight,
} from '../scripts/repository-preflight.mjs';
import { RepositoryStateError } from '../scripts/repository-state.mjs';

const baseState = {
  aheadOfMain: 0,
  behindMain: 0,
  branch: 'automation/002',
  headSha: '1111111111111111111111111111111111111111',
  isDetachedHead: false,
  isWorkingTreeClean: true,
  localMainSha: '2222222222222222222222222222222222222222',
  modifiedTrackedFiles: [],
  repositoryRoot: '/work/odys',
  untrackedFiles: [],
};

function stateWith(overrides) {
  return { ...baseState, ...overrides };
}

describe('repository preflight policy', () => {
  it('is READY for a clean named branch that is not behind local main', () => {
    expect(evaluateRepositoryPreflight(baseState)).toEqual({ status: 'READY', reasons: [] });
  });

  it('allows a dirty worktree', () => {
    const state = stateWith({
      isWorkingTreeClean: false,
      modifiedTrackedFiles: [{ path: 'tracked.txt', status: ' M' }],
      untrackedFiles: ['untracked.txt'],
    });

    expect(evaluateRepositoryPreflight(state)).toEqual({ status: 'READY', reasons: [] });
  });

  it('allows a branch that is ahead of local main', () => {
    expect(evaluateRepositoryPreflight(stateWith({ aheadOfMain: 3 }))).toEqual({
      status: 'READY',
      reasons: [],
    });
  });

  it.each([
    { code: 'detached_head', overrides: { branch: null, isDetachedHead: true } },
    { code: 'on_main', overrides: { branch: 'main' } },
    {
      code: 'local_main_unavailable',
      overrides: { aheadOfMain: null, behindMain: null, localMainSha: null },
    },
    { code: 'behind_local_main', overrides: { behindMain: 2 } },
    { code: 'behind_local_main', overrides: { aheadOfMain: 3, behindMain: 2 } },
  ])('is BLOCKED by $code', ({ code, overrides }) => {
    const result = evaluateRepositoryPreflight(stateWith(overrides));

    expect(result.status).toBe('BLOCKED');
    expect(result.reasons.map((reason) => reason.code)).toEqual([code]);
  });

  it('returns applicable reasons in canonical policy order', () => {
    const result = evaluateRepositoryPreflight(
      stateWith({ branch: 'main', behindMain: 1, isDetachedHead: true }),
    );

    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'detached_head',
      'on_main',
      'behind_local_main',
    ]);
  });

  it('does not infer a behind reason when local main is unavailable', () => {
    const result = evaluateRepositoryPreflight(
      stateWith({ behindMain: 4, branch: 'main', isDetachedHead: true, localMainSha: null }),
    );

    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'detached_head',
      'on_main',
      'local_main_unavailable',
    ]);
  });
});

describe('repository preflight formatting', () => {
  it('shows the relevant local facts and no blockers for READY', () => {
    expect(formatRepositoryPreflight(baseState, evaluateRepositoryPreflight(baseState))).toBe(
      [
        'Preflight: READY',
        'Repository: /work/odys',
        'Branch: automation/002',
        'Working tree: clean',
        'Local main: available',
        'Relation to local main: ahead 0, behind 0',
        'Blocking reasons: none',
      ].join('\n'),
    );
  });

  it('shows detached state, unavailable local main, and structured blockers', () => {
    const state = stateWith({
      aheadOfMain: null,
      behindMain: null,
      branch: null,
      isDetachedHead: true,
      isWorkingTreeClean: false,
      localMainSha: null,
    });
    const output = formatRepositoryPreflight(state, evaluateRepositoryPreflight(state));

    expect(output).toContain('Preflight: BLOCKED');
    expect(output).toContain('Branch: (detached HEAD)');
    expect(output).toContain('Working tree: dirty');
    expect(output).toContain('Local main: unavailable');
    expect(output).toContain('Relation to local main: unavailable');
    expect(output).toContain('- [detached_head] Development work requires a named branch.');
    expect(output).toContain(
      '- [local_main_unavailable] The local main branch is unavailable as a comparison baseline.',
    );
  });
});

describe('dev:preflight process contract', () => {
  it('returns exit code 0 for READY', () => {
    const log = vi.fn();

    expect(runDevPreflight({ collectState: () => baseState, log })).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Preflight: READY'));
  });

  it('returns exit code 2 for a policy BLOCK', () => {
    const log = vi.fn();

    expect(runDevPreflight({ collectState: () => stateWith({ branch: 'main' }), log })).toBe(2);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[on_main]'));
  });

  it('returns exit code 1 and reports collector failures', () => {
    const reportError = vi.fn();
    const failure = new RepositoryStateError('Git returned an invalid repository root');

    expect(
      runDevPreflight({
        collectState: () => {
          throw failure;
        },
        reportError,
      }),
    ).toBe(1);
    expect(reportError).toHaveBeenCalledWith(
      'dev:preflight failed: Git returned an invalid repository root',
    );
  });
});
