import { pathToFileURL } from 'node:url';

import { collectRepositoryState } from './repository-state.mjs';
import { evaluateRepositoryPreflight, formatRepositoryPreflight } from './repository-preflight.mjs';

export function runDevPreflight({
  collectState = collectRepositoryState,
  log = console.log,
  reportError = console.error,
} = {}) {
  try {
    const repositoryState = collectState();
    const preflight = evaluateRepositoryPreflight(repositoryState);

    log(formatRepositoryPreflight(repositoryState, preflight));
    return preflight.status === 'READY' ? 0 : 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportError(`dev:preflight failed: ${message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runDevPreflight();
}
