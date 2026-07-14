/**
 * 数据同步相关配置
 */
export const SYNC_SNAPSHOT_SESSION_KEY = 'sync-snapshot';

/** Local storage key for the Barkeep connection form. */
export const BARKEEP_CONFIG_STORAGE_KEY = 'barkeepConfig';

/** Local storage key for a standalone Barkeep access token. */
export const BARKEEP_SESSION_STORAGE_KEY = 'barkeepSession';

/**
 * 在同步过程中应从 localStorage 中排除的键列表。
 * 这些键通常包含敏感信息或特定于设备的设置，不应在设备之间同步。
 */
export const SYNC_EXCLUDED_KEYS: string[] = [
  // WebDAV 和 Gist 的配置，包含凭据
  'webdavConfig',
  'gistConfig',
  BARKEEP_CONFIG_STORAGE_KEY,
  BARKEEP_SESSION_STORAGE_KEY,

  // 用户界面/编辑器状态
  'split-sizes', // 编辑器面板尺寸
  'active-world-book', // 当前激活的世界书
  'active-character-card', // 当前激活的角色卡
  'character-card-tabs', // 角色卡编辑器打开的标签页

  // 可能会导致冲突的会话特定数据
  SYNC_SNAPSHOT_SESSION_KEY, // 同步快照，用于撤销
];
