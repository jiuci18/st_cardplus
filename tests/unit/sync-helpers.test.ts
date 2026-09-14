import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRemoteBackupSmaller } from '../../src/composables/dataManagement/sync/helpers.ts';

test('warns_when_remote_backup_is_smaller_than_local_data', () => {
  assert.equal(isRemoteBackupSmaller(999, 1000), true);
});

test('does_not_warn_for_equal_or_larger_remote_backup', () => {
  assert.equal(isRemoteBackupSmaller(1000, 1000), false);
  assert.equal(isRemoteBackupSmaller(1001, 1000), false);
});

test('does_not_warn_for_invalid_sizes', () => {
  assert.equal(isRemoteBackupSmaller(Number.NaN, 1000), false);
  assert.equal(isRemoteBackupSmaller(1000, Number.POSITIVE_INFINITY), false);
  assert.equal(isRemoteBackupSmaller(-1, 1000), false);
});
