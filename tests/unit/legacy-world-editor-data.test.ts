import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LegacyWorldEditorDataError,
  parseLegacyWorldEditorSnapshot,
} from '../../src/utils/worldeditor/legacyWorldEditorData.ts';

test('parses_legacy_world_editor_snapshot', () => {
  const snapshot = {
    projects: [{ id: 'project-1' }],
    landmarks: [{ id: 'landmark-1', projectId: 'project-1' }],
    forces: [],
    regions: [],
  };

  assert.deepEqual(parseLegacyWorldEditorSnapshot(JSON.stringify(snapshot)), snapshot);
});

test('rejects_malformed_legacy_json', () => {
  assert.throws(
    () => parseLegacyWorldEditorSnapshot('{"projects":'),
    (error) =>
      error instanceof LegacyWorldEditorDataError &&
      error.message === '旧版世界编辑器数据无法解析，原数据已保留',
  );
});

test('rejects_incomplete_legacy_snapshot', () => {
  assert.throws(
    () => parseLegacyWorldEditorSnapshot(JSON.stringify({ projects: [] })),
    (error) =>
      error instanceof LegacyWorldEditorDataError &&
      error.message === '旧版世界编辑器数据格式不正确，原数据已保留',
  );
});
