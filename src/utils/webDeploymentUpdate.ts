/** The local-storage key holding the last opened Web build commit ID. */
export const WEB_LAST_OPENED_COMMIT_ID_KEY = 'webLastOpenedCommitId';

/** Minimal persistent storage contract used to track deployed Web builds. */
export interface CommitIdStorage {
  /** Returns the stored commit ID, or `null` when no deployment was opened before. */
  get(key: string): string | null;
  /** Persists the commit ID for a future Web application start. */
  set(key: string, value: string): void;
}

/** Result of recording the currently opened Web deployment. */
export interface WebDeploymentUpdateResult {
  /** Whether a previously recorded, different commit ID was replaced. */
  hasUpdated: boolean;
  /** The current build commit ID. */
  currentCommitId: string;
}

/**
 * Records a Web build commit ID and reports whether it differs from the prior build.
 *
 * An empty current commit ID is ignored so a failed build-time injection cannot erase a
 * previously stored valid value. The first recorded commit is not considered an update.
 */
export const recordWebDeploymentCommit = (
  storage: CommitIdStorage,
  currentCommitId: string,
): WebDeploymentUpdateResult => {
  const normalizedCommitId = currentCommitId.trim();
  const previousCommitId = storage.get(WEB_LAST_OPENED_COMMIT_ID_KEY)?.trim() ?? '';

  if (!normalizedCommitId) {
    return {
      hasUpdated: false,
      currentCommitId: '',
    };
  }

  storage.set(WEB_LAST_OPENED_COMMIT_ID_KEY, normalizedCommitId);

  return {
    hasUpdated: previousCommitId.length > 0 && previousCommitId !== normalizedCommitId,
    currentCommitId: normalizedCommitId,
  };
};
