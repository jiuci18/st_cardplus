import type { WorldEditorSnapshot } from '@/database/appdb/worldEditorService';

/** Error raised when legacy world-editor data cannot be safely migrated. */
export class LegacyWorldEditorDataError extends Error { }
export function parseLegacyWorldEditorSnapshot(raw: string): WorldEditorSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new LegacyWorldEditorDataError('旧版世界编辑器数据无法解析，原数据已保留');
  }

  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as WorldEditorSnapshot).projects) ||
    !Array.isArray((value as WorldEditorSnapshot).landmarks) ||
    !Array.isArray((value as WorldEditorSnapshot).forces) ||
    !Array.isArray((value as WorldEditorSnapshot).regions)
  ) {
    throw new LegacyWorldEditorDataError('旧版世界编辑器数据格式不正确，原数据已保留');
  }

  return value as WorldEditorSnapshot;
}
