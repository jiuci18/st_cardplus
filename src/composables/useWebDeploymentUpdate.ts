import { isTauriApp } from '@/utils/system/tauri';
import { recordWebDeploymentCommit, type CommitIdStorage } from '@/utils/webDeploymentUpdate';
import { ElMessage } from 'element-plus';

const webCommitStorage: CommitIdStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
    }
  },
};

/**
 * Records the opened Web build and notifies the user when it replaced a prior build.
 *
 * Desktop builds are intentionally excluded because their update lifecycle is managed
 * separately from Web deployments.
 */
export const notifyWebDeploymentUpdate = (): void => {
  if (isTauriApp()) return;

  const result = recordWebDeploymentCommit(webCommitStorage, __APP_VERSION__);
  if (!result.hasUpdated) return;

  ElMessage.success({
    message: `网站已自动更新，当前 Git ID：${result.currentCommitId}`,
    duration: 4_500,
  });
};
