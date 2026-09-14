import type { BackupData } from '@/types/gist';
import { exportAllDatabases, importAllDatabases } from '@/database/utils';
import {
  getLocalStorageSnapshot,
  readSessionStorageJSON,
  restoreLocalStorageSnapshot,
  setSessionStorageItem,
  removeSessionStorageItem,
} from '@/utils/localStorageUtils';
import { nowIso } from '@/utils/datetime';
import { preserveLocalSyncConfigs, redactSyncConfigs } from '@/utils/syncConfigSettings';

export type SyncSnapshot = Record<string, string | null>;

export async function buildBackupData(
  excludedKeys: string[],
  onProgress?: (text: string) => void
): Promise<BackupData> {
  const localStorageData = redactSyncConfigs(getLocalStorageSnapshot({ excludeKeys: excludedKeys }));
  onProgress?.('正在整理本地数据...');
  const databases = await exportAllDatabases();
  onProgress?.('本地数据准备完成');

  return {
    timestamp: nowIso(),
    version: '1.0.0',
    localStorage: localStorageData,
    databases: databases as unknown as BackupData['databases'],
  };
}

export async function saveSnapshot(
  snapshotKey: string,
  excludedKeys: string[],
  databaseSnapshot?: Record<string, string>,
): Promise<boolean> {
  const localStorageData = getLocalStorageSnapshot({ excludeKeys: excludedKeys });
  const dbSnapshot = databaseSnapshot ?? await exportAllDatabases();
  const snapshot = { ...localStorageData, ...dbSnapshot };

  try {
    setSessionStorageItem(snapshotKey, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    console.error('保存撤销快照失败:', error);
    removeSessionStorageItem(snapshotKey);
    return false;
  }
}

export function readSnapshot(snapshotKey: string): SyncSnapshot | null {
  return readSessionStorageJSON<SyncSnapshot>(snapshotKey);
}

export async function applyBackupData(
  backupData: BackupData,
): Promise<void> {
  const currentLocalStorage = getLocalStorageSnapshot();
  const incomingLocalStorage = preserveLocalSyncConfigs(backupData.localStorage, currentLocalStorage);
  const flatData = { ...incomingLocalStorage, ...backupData.databases };
  await importAllDatabases(flatData);
  restoreLocalStorageSnapshot(incomingLocalStorage);
}

export async function restoreFromSnapshot(snapshot: SyncSnapshot): Promise<void> {
  await importAllDatabases(snapshot);
  restoreLocalStorageSnapshot(snapshot);
}
