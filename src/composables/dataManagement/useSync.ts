import { computed, ref, watch, type InjectionKey } from 'vue';
import { ElMessage } from 'element-plus';
import { uploadToWebDAVWithProgress, downloadFromWebDAVWithProgress, testWebDAVConnection } from '@/utils/cloud/webdav';
import {
  createBackupGist,
  downloadFromGistWithProgress,
  listUserGists,
  loadGistConfig,
  saveGistConfig,
  testGistConnection,
  uploadToGist,
} from '@/utils/cloud/gist';
import { SYNC_EXCLUDED_KEYS, SYNC_SNAPSHOT_SESSION_KEY } from '@/config/dataSyncConfig';
import { getSessionStorageItem, removeSessionStorageItem, writeLocalStorageJSON } from '@/utils/localStorageUtils';
import { formatDateTime, formatRelative, now, nowIso } from '@/utils/datetime';
import type { GistConfig } from '@/types/gist';
import { DEFAULT_SYNC_PROVIDER, SYNC_PROVIDER_OPTIONS, WEB_DAV_BACKUP_FILE_NAME } from './sync/constants';
import { confirmLargeRevert, confirmPull, confirmPush, selectGist } from './sync/dialogs';
import {
  calculateJsonSizeBytes,
  formatDownloadProgressText,
  formatErrorMessage,
  parseBackupData,
} from './sync/helpers';
import { useSyncProgress } from './sync/progress';
import { applyBackupData, buildBackupData, readSnapshot, restoreFromSnapshot, saveSnapshot } from './sync/storage';
import type { SyncProvider, TransferProgress, WebDAVConfig } from '@/types/dataSync';

export function useSync() {
  const webdavConfig = ref<WebDAVConfig>({ url: '', username: '', password: '' });
  const gistConfig = ref<GistConfig>({ token: '', gistId: '', lastSyncTime: undefined, autoSync: false });
  const selectedProvider = ref<SyncProvider>(DEFAULT_SYNC_PROVIDER);
  const snapshotAvailable = ref(false);

  const progress = useSyncProgress();
  const providerOptions = SYNC_PROVIDER_OPTIONS;

  const persistSyncConfigs = () => {
    writeLocalStorageJSON('webdavConfig', webdavConfig.value);
    saveGistConfig(gistConfig.value);
  };

  const canPush = computed(() => {
    if (selectedProvider.value === 'webdav') return !!webdavConfig.value.url;
    return !!gistConfig.value.token;
  });

  const canPull = computed(() => {
    if (selectedProvider.value === 'webdav') return !!webdavConfig.value.url;
    return !!gistConfig.value.token && !!gistConfig.value.gistId;
  });

  watch(
    webdavConfig,
    (nextValue) => {
      localStorage.setItem('webdavConfig', JSON.stringify(nextValue));
    },
    { deep: true }
  );

  watch(
    gistConfig,
    (nextValue) => {
      saveGistConfig(nextValue);
    },
    { deep: true }
  );

  const formatSyncTime = (timestamp: string) => {
    return formatRelative(timestamp, now(), 'zh-CN') || formatDateTime(timestamp, 'zh-CN') || '未知时间';
  };

  const openGistTokenHelp = () => {
    window.open('https://github.com/settings/tokens/new?scopes=gist&description=ST-CardPlus-Sync', '_blank');
  };

  const initialize = () => {
    const storedWebDAVConfig = localStorage.getItem('webdavConfig');
    if (storedWebDAVConfig) {
      webdavConfig.value = JSON.parse(storedWebDAVConfig);
    }

    gistConfig.value = loadGistConfig() ?? gistConfig.value;
    snapshotAvailable.value = !!getSessionStorageItem(SYNC_SNAPSHOT_SESSION_KEY);
    if (!snapshotAvailable.value) {
      removeSessionStorageItem(SYNC_SNAPSHOT_SESSION_KEY);
    }
  };

  const clearSnapshot = () => {
    removeSessionStorageItem(SYNC_SNAPSHOT_SESSION_KEY);
    snapshotAvailable.value = false;
  };

  const testWebDAV = async (): Promise<boolean> => {
    if (!webdavConfig.value.url) {
      ElMessage.error('请输入 WebDAV URL');
      return false;
    }

    try {
      ElMessage.info('正在测试连接...');
      await testWebDAVConnection(webdavConfig.value);
      ElMessage.success('连接成功！');
      return true;
    } catch (error) {
      console.error('WebDAV 连接测试失败:', error);
      ElMessage.error(`连接失败: ${formatErrorMessage(error, '未知错误')}`);
      return false;
    }
  };

  const testGist = async (): Promise<boolean> => {
    if (!gistConfig.value.token) {
      ElMessage.error('请输入 GitHub Personal Access Token');
      return false;
    }

    try {
      ElMessage.info('正在测试连接...');
      const result = await testGistConnection(gistConfig.value.token);
      if (!result.success) {
        ElMessage.error(result.message);
        return false;
      }
      ElMessage.success(result.message);
      return true;
    } catch (error) {
      console.error('测试 Gist 连接失败:', error);
      ElMessage.error(`连接失败: ${formatErrorMessage(error, '未知错误')}`);
      return false;
    }
  };

  const testConnection = async () => {
    persistSyncConfigs();
    progress.start('test', '正在测试连接...');
    const ok = selectedProvider.value === 'webdav' ? await testWebDAV() : await testGist();
    if (ok) {
      progress.finish('完成');
      return;
    }
    progress.fail('连接失败');
  };

  const pullFromProvider = async (
    provider: SyncProvider,
    downloadFn: (onProgress?: (progress: TransferProgress) => void) => Promise<unknown>,
    onCompleted?: () => void
  ) => {
    progress.start('pull', `正在从 ${provider} 拉取数据...`);
    progress.update('下载中... · -- KB/S : -- KB');
    ElMessage.info(`正在从 ${provider} 拉取数据...`);

    try {
      let lastLoaded = 0;
      let lastTime = Date.now();

      const downloadResult = await downloadFn((transferProgress) => {
        const currentTime = Date.now();
        const deltaBytes = Math.max(0, transferProgress.loaded - lastLoaded);
        const deltaMs = Math.max(1, currentTime - lastTime);
        const speed = (deltaBytes * 1000) / deltaMs;

        lastLoaded = transferProgress.loaded;
        lastTime = currentTime;

        progress.update(formatDownloadProgressText(provider, speed, transferProgress));
      });

      const backupData = parseBackupData(provider, downloadResult);
      if (!backupData) {
        const providerMessage = (downloadResult as { message?: string } | null)?.message;
        ElMessage.error(providerMessage || '拉取失败或数据为空');
        progress.fail('拉取失败');
        return;
      }

      clearSnapshot();
      const snapshotSaved = await saveSnapshot(SYNC_SNAPSHOT_SESSION_KEY, SYNC_EXCLUDED_KEYS);
      snapshotAvailable.value = snapshotSaved;

      const confirmed = await confirmPull(backupData.timestamp, snapshotSaved);
      if (!confirmed) {
        clearSnapshot();
        progress.fail('已取消');
        return;
      }

      progress.update('正在应用云端数据...');
      await applyBackupData(backupData);
      onCompleted?.();

      ElMessage.success(`数据已成功从 ${provider} 恢复，应用将重新加载`);
      progress.finish('完成');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error(`从 ${provider} 拉取失败:`, error);
      ElMessage.error(`拉取失败: ${formatErrorMessage(error, '未知错误')}`);
      progress.fail('拉取失败');
    }
  };

  const pushWebDAV = async () => {
    if (!webdavConfig.value.url) {
      ElMessage.error('请输入 WebDAV URL');
      return;
    }

    progress.start('push', '正在准备数据...');
    ElMessage.info('正在准备数据并上传...');

    try {
      const backupData = await buildBackupData(SYNC_EXCLUDED_KEYS, progress.update);
      const payload = JSON.stringify(backupData, null, 2);
      progress.update('推送中...');
      await uploadToWebDAVWithProgress(webdavConfig.value, WEB_DAV_BACKUP_FILE_NAME, payload);
      ElMessage.success('数据已成功推送到 WebDAV 服务器');
      progress.finish('完成');
    } catch (error) {
      console.error('推送到 WebDAV 失败:', error);
      ElMessage.error(`推送失败: ${formatErrorMessage(error, '未知错误')}`);
      progress.fail('推送失败');
    }
  };

  const pushGist = async () => {
    if (!gistConfig.value.token) {
      ElMessage.error('请输入 GitHub Personal Access Token');
      return;
    }

    progress.start('push', '正在准备数据...');
    ElMessage.info('正在准备数据并上传...');

    try {
      const backupData = await buildBackupData(SYNC_EXCLUDED_KEYS, progress.update);
      const backupSize = calculateJsonSizeBytes(backupData);
      const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);

      if (backupSize > 100 * 1024 * 1024) {
        ElMessage.warning(`备份文件过大 (${backupSizeMB}MB), 超过 Gist 单文件 100MB 限制，推送可能失败`);
        progress.fail('文件过大');
        return;
      }
      if (backupSize > 50 * 1024 * 1024) {
        ElMessage.warning(`备份文件较大 (${backupSizeMB}MB), 建议清理无用数据`);
      }

      progress.update('推送中...');
      const result = gistConfig.value.gistId
        ? await uploadToGist(gistConfig.value.token, gistConfig.value.gistId, backupData)
        : await createBackupGist(gistConfig.value.token, backupData);

      if (!result.success) {
        ElMessage.error(result.message);
        progress.fail('推送失败');
        return;
      }

      if (!gistConfig.value.gistId && result.data?.gistId) {
        gistConfig.value.gistId = result.data.gistId;
      }
      gistConfig.value.lastSyncTime = nowIso();
      ElMessage.success(`${result.message} (大小: ${backupSizeMB}MB)`);
      progress.finish('完成');
    } catch (error) {
      console.error('[Gist Push] 推送失败:', error);
      ElMessage.error(`推送失败: ${formatErrorMessage(error, '未知错误')}`);
      progress.fail('推送失败');
    }
  };

  const pullWebDAV = async () => {
    if (!webdavConfig.value.url) {
      ElMessage.error('请输入 WebDAV URL');
      return;
    }

    await pullFromProvider('webdav', (onProgress) =>
      downloadFromWebDAVWithProgress(webdavConfig.value, WEB_DAV_BACKUP_FILE_NAME, onProgress)
    );
  };

  const pullGist = async () => {
    if (!gistConfig.value.token || !gistConfig.value.gistId) {
      ElMessage.error('请输入 Token 和 Gist ID');
      return;
    }

    await pullFromProvider(
      'gist',
      (onProgress) => downloadFromGistWithProgress(gistConfig.value.token, gistConfig.value.gistId, onProgress),
      () => {
        gistConfig.value.lastSyncTime = nowIso();
        saveGistConfig(gistConfig.value);
      }
    );
  };

  const push = async () => {
    persistSyncConfigs();
    const confirmed = await confirmPush();
    if (!confirmed) return;

    if (selectedProvider.value === 'webdav') {
      await pushWebDAV();
      return;
    }
    await pushGist();
  };

  const pull = async () => {
    persistSyncConfigs();
    if (selectedProvider.value === 'webdav') {
      await pullWebDAV();
      return;
    }
    await pullGist();
  };

  const revertLastPull = async (): Promise<boolean> => {
    if (!snapshotAvailable.value) return false;

    const snapshot = readSnapshot(SYNC_SNAPSHOT_SESSION_KEY);
    if (!snapshot) {
      ElMessage.error('没有可用的快照 请检查是否已执行拉取操作 ');
      clearSnapshot();
      return false;
    }

    const snapshotSize = new Blob([JSON.stringify(snapshot)]).size;
    const canContinue = await confirmLargeRevert(snapshotSize);
    if (!canContinue) return false;

    try {
      await restoreFromSnapshot(snapshot);
      clearSnapshot();
      ElMessage.success('操作已撤销，应用将重新加载');
      setTimeout(() => window.location.reload(), 1500);
      return true;
    } catch (error) {
      console.error('恢复快照失败:', error);
      ElMessage.error('恢复快照失败，请检查控制台');
      return false;
    }
  };

  const listGists = async () => {
    persistSyncConfigs();
    if (!gistConfig.value.token) {
      ElMessage.error('请输入 GitHub Personal Access Token');
      return;
    }

    try {
      ElMessage.info('正在获取 Gist 列表...');
      const result = await listUserGists(gistConfig.value.token);
      if (!result.success || !result.data) {
        ElMessage.error(result.message);
        return;
      }

      if (result.data.length === 0) {
        ElMessage.info('未找到任何 Gist，您可以先推送创建一个新的');
        return;
      }

      const selectedGistId = await selectGist(result.data, gistConfig.value.gistId);
      if (!selectedGistId) return;

      gistConfig.value.gistId = selectedGistId;
      ElMessage.success(`已选择 Gist: ${selectedGistId}`);
    } catch (error) {
      console.error('获取 Gist 列表失败:', error);
      ElMessage.error(`获取失败: ${formatErrorMessage(error, '未知错误')}`);
    }
  };

  return {
    state: {
      webdavConfig,
      gistConfig,
      selectedProvider,
      providerOptions,
      canPush,
      canPull,
      snapshotAvailable,
      syncProgressActive: progress.active,
      syncProgressText: progress.text,
      syncCurrentAction: progress.action,
    },
    actions: {
      init: initialize,
      clearSnapshot,
      revertLastPull,
      testConnection,
      push,
      pull,
      listGists,
      openGistTokenHelp,
    },
    utils: {
      formatSyncTime,
    },
  };
}

export type SyncStore = ReturnType<typeof useSync>;
export const syncInjectionKey: InjectionKey<SyncStore> = Symbol('sync');
