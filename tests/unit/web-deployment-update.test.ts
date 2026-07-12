import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WEB_LAST_OPENED_COMMIT_ID_KEY,
  recordWebDeploymentCommit,
  type CommitIdStorage,
} from '../../src/utils/webDeploymentUpdate.ts';

class MemoryStorage implements CommitIdStorage {
  private readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test('does_not_report_an_update_for_the_first_opened_build', () => {
  const storage = new MemoryStorage();

  const result = recordWebDeploymentCommit(storage, 'abc1234');

  assert.equal(result.hasUpdated, false);
  assert.equal(storage.get(WEB_LAST_OPENED_COMMIT_ID_KEY), 'abc1234');
});

test('reports_an_update_when_the_opened_build_changes', () => {
  const storage = new MemoryStorage();
  storage.set(WEB_LAST_OPENED_COMMIT_ID_KEY, 'abc1234');

  const result = recordWebDeploymentCommit(storage, 'def5678');

  assert.equal(result.hasUpdated, true);
  assert.equal(result.currentCommitId, 'def5678');
  assert.equal(storage.get(WEB_LAST_OPENED_COMMIT_ID_KEY), 'def5678');
});

test('does_not_replace_a_stored_build_with_an_empty_id', () => {
  const storage = new MemoryStorage();
  storage.set(WEB_LAST_OPENED_COMMIT_ID_KEY, 'abc1234');

  const result = recordWebDeploymentCommit(storage, '   ');

  assert.equal(result.hasUpdated, false);
  assert.equal(storage.get(WEB_LAST_OPENED_COMMIT_ID_KEY), 'abc1234');
});
