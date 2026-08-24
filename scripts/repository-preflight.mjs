const blockingReasons = {
  detached_head: {
    code: 'detached_head',
    message: 'Development work requires a named branch.',
  },
  on_main: {
    code: 'on_main',
    message: 'Development work must run on a non-main branch.',
  },
  local_main_unavailable: {
    code: 'local_main_unavailable',
    message: 'The local main branch is unavailable as a comparison baseline.',
  },
  behind_local_main: {
    code: 'behind_local_main',
    message: 'The current branch is behind local main.',
  },
};

export function evaluateRepositoryPreflight(repositoryState) {
  const reasons = [];

  if (repositoryState.isDetachedHead) {
    reasons.push(blockingReasons.detached_head);
  }

  if (repositoryState.branch === 'main') {
    reasons.push(blockingReasons.on_main);
  }

  if (repositoryState.localMainSha === null) {
    reasons.push(blockingReasons.local_main_unavailable);
  } else if (repositoryState.behindMain > 0) {
    reasons.push(blockingReasons.behind_local_main);
  }

  return {
    status: reasons.length === 0 ? 'READY' : 'BLOCKED',
    reasons,
  };
}

export function formatRepositoryPreflight(repositoryState, preflight) {
  const lines = [
    `Preflight: ${preflight.status}`,
    `Repository: ${repositoryState.repositoryRoot}`,
    `Branch: ${repositoryState.isDetachedHead ? '(detached HEAD)' : repositoryState.branch}`,
    `Working tree: ${repositoryState.isWorkingTreeClean ? 'clean' : 'dirty'}`,
    `Local main: ${repositoryState.localMainSha === null ? 'unavailable' : 'available'}`,
    repositoryState.localMainSha === null
      ? 'Relation to local main: unavailable'
      : `Relation to local main: ahead ${repositoryState.aheadOfMain}, behind ${repositoryState.behindMain}`,
  ];

  if (preflight.reasons.length === 0) {
    lines.push('Blocking reasons: none');
  } else {
    lines.push('', 'Blocking reasons:');

    for (const reason of preflight.reasons) {
      lines.push(`- [${reason.code}] ${reason.message}`);
    }
  }

  return lines.join('\n');
}
