//! Sync-credential handling for the single `settings` local-storage record.

import type { WebDAVConfig } from '../types/dataSync';
import type { GistConfig } from '../types/gist';

/** The local-storage record containing application settings. */
export const SETTINGS_STORAGE_KEY = 'settings';

/** Legacy standalone local-storage keys migrated into application settings. */
export const LEGACY_SYNC_CONFIG_KEYS = ['webdavConfig', 'gistConfig'] as const;

/** Sync-provider settings stored inside the application settings record. */
export interface SyncConfigSettings {
  webdavConfig: WebDAVConfig;
  gistConfig: GistConfig;
}

/** Creates fresh empty sync-provider settings. */
export function createDefaultSyncConfigSettings(): SyncConfigSettings {
  return {
    webdavConfig: { url: '', username: '', password: '' },
    gistConfig: { token: '', gistId: '', lastSyncTime: undefined, autoSync: false },
  };
}

function parseObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeWebDAVConfig(value: unknown): WebDAVConfig | null {
  const config = asObject(value);
  if (!config) return null;
  return {
    url: typeof config.url === 'string' ? config.url : '',
    username: typeof config.username === 'string' ? config.username : '',
    password: typeof config.password === 'string' ? config.password : '',
  };
}

function normalizeGistConfig(value: unknown): GistConfig | null {
  const config = asObject(value);
  if (!config) return null;
  return {
    token: typeof config.token === 'string' ? config.token : '',
    gistId: typeof config.gistId === 'string' ? config.gistId : '',
    lastSyncTime: typeof config.lastSyncTime === 'string' ? config.lastSyncTime : undefined,
    autoSync: config.autoSync === true,
  };
}

/**
 * Resolves sync settings, preferring nested settings over legacy standalone records.
 */
export function resolveSyncConfigSettings(
  settings: Record<string, unknown>,
  legacyWebDAV: unknown,
  legacyGist: unknown,
): SyncConfigSettings {
  const defaults = createDefaultSyncConfigSettings();
  return {
    webdavConfig:
      normalizeWebDAVConfig(settings.webdavConfig) ?? normalizeWebDAVConfig(legacyWebDAV) ?? defaults.webdavConfig,
    gistConfig: normalizeGistConfig(settings.gistConfig) ?? normalizeGistConfig(legacyGist) ?? defaults.gistConfig,
  };
}

/**
 * Removes sync credentials from a local-storage snapshot before cloud upload.
 */
export function redactSyncConfigs(
  snapshot: Record<string, string | null>,
): Record<string, string | null> {
  const redacted = { ...snapshot };
  for (const key of LEGACY_SYNC_CONFIG_KEYS) delete redacted[key];

  const settings = parseObject(redacted[SETTINGS_STORAGE_KEY]);
  if (!settings) return redacted;

  delete settings.webdavConfig;
  delete settings.gistConfig;
  redacted[SETTINGS_STORAGE_KEY] = JSON.stringify(settings);
  return redacted;
}

/**
 * Merges remote storage with device-local sync credentials before restoration.
 * Remote credentials are always discarded, including credentials from legacy backups.
 */
export function preserveLocalSyncConfigs(
  incoming: Record<string, string | null>,
  current: Record<string, string | null>,
): Record<string, string | null> {
  const merged = { ...incoming };
  const incomingSettings = parseObject(merged[SETTINGS_STORAGE_KEY]) ?? {};
  const currentSettings = parseObject(current[SETTINGS_STORAGE_KEY]) ?? {};
  const legacyWebDAV = parseObject(current.webdavConfig);
  const legacyGist = parseObject(current.gistConfig);
  const localSync = resolveSyncConfigSettings(currentSettings, legacyWebDAV, legacyGist);

  for (const key of LEGACY_SYNC_CONFIG_KEYS) delete merged[key];
  delete incomingSettings.webdavConfig;
  delete incomingSettings.gistConfig;
  incomingSettings.webdavConfig = localSync.webdavConfig;
  incomingSettings.gistConfig = localSync.gistConfig;
  merged[SETTINGS_STORAGE_KEY] = JSON.stringify(incomingSettings);
  return merged;
}
