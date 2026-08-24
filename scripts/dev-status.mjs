import {
  collectRepositoryState,
  formatRepositoryState,
  RepositoryStateError,
} from './repository-state.mjs';

try {
  console.log(formatRepositoryState(collectRepositoryState()));
} catch (error) {
  const message = error instanceof RepositoryStateError ? error.message : 'Unexpected failure';
  console.error(`dev:status failed: ${message}`);
  process.exitCode = 1;
}
