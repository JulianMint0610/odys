import { spawnSync } from 'node:child_process';

const validStatusCharacters = new Set([' ', 'M', 'T', 'A', 'D', 'R', 'C', 'U', '?', '!']);

export class RepositoryStateError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'RepositoryStateError';
  }
}

export function runLocalGit(args, { cwd = process.cwd() } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw new RepositoryStateError(`Unable to execute Git: ${result.error.message}`, {
      cause: result.error,
    });
  }

  if (typeof result.status !== 'number') {
    throw new RepositoryStateError('Git terminated without an exit code');
  }

  return {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

function removeTerminatingLineBreak(output) {
  if (output.endsWith('\r\n')) {
    return output.slice(0, -2);
  }

  return output.endsWith('\n') ? output.slice(0, -1) : output;
}

function describeGitFailure(args, result) {
  const detail = removeTerminatingLineBreak(result.stderr);
  const suffix = detail.length > 0 ? `: ${detail}` : '';
  return `Git command failed (git ${args.join(' ')})${suffix}`;
}

function runRequiredGit(runGit, args, cwd) {
  let result;

  try {
    result = runGit(args, { cwd });
  } catch (error) {
    if (error instanceof RepositoryStateError) {
      throw error;
    }

    throw new RepositoryStateError(`Unable to execute git ${args.join(' ')}`, { cause: error });
  }

  if (result.exitCode !== 0) {
    throw new RepositoryStateError(describeGitFailure(args, result));
  }

  return result.stdout;
}

function runGitAllowingMissing(runGit, args, cwd) {
  let result;

  try {
    result = runGit(args, { cwd });
  } catch (error) {
    if (error instanceof RepositoryStateError) {
      throw error;
    }

    throw new RepositoryStateError(`Unable to execute git ${args.join(' ')}`, { cause: error });
  }

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new RepositoryStateError(describeGitFailure(args, result));
  }

  return result;
}

function parseRequiredValue(label, output) {
  const value = removeTerminatingLineBreak(output);

  if (value.length === 0) {
    throw new RepositoryStateError(`Git returned an empty ${label}`);
  }

  return value;
}

function parseCommitSha(label, output) {
  const sha = parseRequiredValue(label, output);

  if (!/^[0-9a-f]+$/u.test(sha)) {
    throw new RepositoryStateError(`Git returned an invalid ${label}`);
  }

  return sha;
}

function parseRelationToMain(output) {
  const relation = /^(\d+)\s+(\d+)$/u.exec(removeTerminatingLineBreak(output));

  if (!relation) {
    throw new RepositoryStateError('Git returned an invalid relation to local main');
  }

  const behindMain = Number(relation[1]);
  const aheadOfMain = Number(relation[2]);

  if (!Number.isSafeInteger(behindMain) || !Number.isSafeInteger(aheadOfMain)) {
    throw new RepositoryStateError('Git returned an unsafe relation count for local main');
  }

  return { aheadOfMain, behindMain };
}

function isRenameOrCopy(status) {
  return status[0] === 'R' || status[0] === 'C' || status[1] === 'R' || status[1] === 'C';
}

export function parsePorcelainStatus(output) {
  const records = output.split('\0');

  if (records.at(-1) !== '') {
    throw new RepositoryStateError('Git status output was not NUL-terminated');
  }

  records.pop();

  const modifiedTrackedFiles = [];
  const untrackedFiles = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];

    if (
      record.length < 4 ||
      record[2] !== ' ' ||
      !validStatusCharacters.has(record[0]) ||
      !validStatusCharacters.has(record[1])
    ) {
      throw new RepositoryStateError('Git returned an invalid porcelain status record');
    }

    const status = record.slice(0, 2);
    const path = record.slice(3);

    if (path.length === 0) {
      throw new RepositoryStateError('Git returned an empty path in porcelain status');
    }

    if (status === '??') {
      untrackedFiles.push(path);
      continue;
    }

    if (status === '!!') {
      continue;
    }

    if (status.includes('?') || status.includes('!')) {
      throw new RepositoryStateError('Git returned an invalid tracked-file status');
    }

    const modifiedFile = { path, status };

    if (isRenameOrCopy(status)) {
      index += 1;
      const originalPath = records[index];

      if (typeof originalPath !== 'string' || originalPath.length === 0) {
        throw new RepositoryStateError('Git returned an incomplete rename or copy status');
      }

      modifiedFile.originalPath = originalPath;
    }

    modifiedTrackedFiles.push(modifiedFile);
  }

  return { modifiedTrackedFiles, untrackedFiles };
}

export function collectRepositoryState(runGit = runLocalGit) {
  const rootArgs = ['rev-parse', '--show-toplevel'];
  const repositoryRoot = parseRequiredValue(
    'repository root',
    runRequiredGit(runGit, rootArgs, process.cwd()),
  );

  const branchArgs = ['symbolic-ref', '--quiet', '--short', 'HEAD'];
  const branchResult = runGitAllowingMissing(runGit, branchArgs, repositoryRoot);
  const isDetachedHead = branchResult.exitCode === 1;
  const branch = isDetachedHead ? null : parseRequiredValue('current branch', branchResult.stdout);

  const headSha = parseCommitSha(
    'HEAD commit SHA',
    runRequiredGit(runGit, ['rev-parse', '--verify', 'HEAD'], repositoryRoot),
  );

  const mainArgs = ['rev-parse', '--verify', '--quiet', 'refs/heads/main'];
  const mainResult = runGitAllowingMissing(runGit, mainArgs, repositoryRoot);
  const localMainSha =
    mainResult.exitCode === 1 ? null : parseCommitSha('local main commit SHA', mainResult.stdout);

  const statusOutput = runRequiredGit(
    runGit,
    ['--no-optional-locks', 'status', '--porcelain=v1', '-z', '--untracked-files=all'],
    repositoryRoot,
  );
  const { modifiedTrackedFiles, untrackedFiles } = parsePorcelainStatus(statusOutput);

  let aheadOfMain = null;
  let behindMain = null;

  if (localMainSha !== null) {
    const relation = parseRelationToMain(
      runRequiredGit(
        runGit,
        ['rev-list', '--left-right', '--count', 'refs/heads/main...HEAD'],
        repositoryRoot,
      ),
    );
    aheadOfMain = relation.aheadOfMain;
    behindMain = relation.behindMain;
  }

  return {
    aheadOfMain,
    behindMain,
    branch,
    headSha,
    isDetachedHead,
    isWorkingTreeClean: modifiedTrackedFiles.length === 0 && untrackedFiles.length === 0,
    localMainSha,
    modifiedTrackedFiles,
    repositoryRoot,
    untrackedFiles,
  };
}

function formatTrackedPath(file) {
  if (file.originalPath === undefined) {
    return file.path;
  }

  return `${file.originalPath} -> ${file.path}`;
}

export function formatRepositoryState(state) {
  const lines = [
    `Repository: ${state.repositoryRoot}`,
    `Branch: ${state.isDetachedHead ? '(detached HEAD)' : state.branch}`,
    `HEAD: ${state.headSha}`,
    `Local main: ${state.localMainSha ?? 'unavailable (local branch not found)'}`,
    `Working tree: ${state.isWorkingTreeClean ? 'clean' : 'dirty'}`,
    `Modified tracked files: ${state.modifiedTrackedFiles.length}`,
  ];

  for (const file of state.modifiedTrackedFiles) {
    lines.push(`  [${file.status}] ${formatTrackedPath(file)}`);
  }

  lines.push(`Untracked files: ${state.untrackedFiles.length}`);

  for (const path of state.untrackedFiles) {
    lines.push(`  ${path}`);
  }

  lines.push(
    state.localMainSha === null
      ? 'Relation to local main: unavailable (local branch not found)'
      : `Relation to local main: ahead ${state.aheadOfMain}, behind ${state.behindMain}`,
  );

  return lines.join('\n');
}
