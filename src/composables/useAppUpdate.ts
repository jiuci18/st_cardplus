import { computed, readonly, ref } from 'vue';

type AppChannel = 'stable' | 'dev';

interface UpdateMetadata {
  version?: string;
  channel?: string;
  buildTime?: string;
}

const UPDATE_METADATA_URLS: Record<AppChannel, string> = {
  stable: 'https://cardplus.jiuci.top/metadata.json',
  dev: 'https://dev.st-cardplus-1kl.pages.dev/metadata.json',
};

const currentVersion = __APP_SEMVER__;
const currentChannel: AppChannel = __APP_CHANNEL__ === 'stable' ? 'stable' : 'dev';
const latestVersion = ref('');
const updateAvailable = ref(false);
const hasCheckedForUpdate = ref(false);
const isCheckingForUpdate = ref(false);
const updateCheckError = ref<string | null>(null);
const updateBannerText = computed(() => {
  return latestVersion.value ? `有更新可用（v${latestVersion.value}） | 请更新` : '有更新可用 | 请更新';
});

let inFlightCheck: Promise<void> | null = null;

const compareVersions = (remoteVersion: string, localVersion: string) => {
  const remoteParts = remoteVersion.split('.');
  const localParts = localVersion.split('.');
  const maxLength = Math.max(remoteParts.length, localParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const remotePart = Number.parseInt(remoteParts[index] ?? '0', 10);
    const localPart = Number.parseInt(localParts[index] ?? '0', 10);

    if (Number.isNaN(remotePart) || Number.isNaN(localPart)) {
      return remoteVersion.localeCompare(localVersion, undefined, { numeric: true, sensitivity: 'base' });
    }

    if (remotePart > localPart) return 1;
    if (remotePart < localPart) return -1;
  }

  return 0;
};

const runUpdateCheck = async () => {
  isCheckingForUpdate.value = true;
  updateCheckError.value = null;

  try {
    const response = await fetch(UPDATE_METADATA_URLS[currentChannel], { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`metadata request failed with status ${response.status}`);
    }

    const metadata = (await response.json()) as UpdateMetadata;
    const remoteVersion = metadata.version?.trim();

    if (!remoteVersion) {
      throw new Error('metadata version is missing');
    }

    latestVersion.value = remoteVersion;
    updateAvailable.value = compareVersions(remoteVersion, currentVersion) > 0;
  } catch (error) {
    updateCheckError.value = error instanceof Error ? error.message : 'unknown error';
    updateAvailable.value = false;
    console.warn('检查应用更新失败:', error);
  } finally {
    hasCheckedForUpdate.value = true;
    isCheckingForUpdate.value = false;
  }
};

const checkForAppUpdate = async () => {
  if (inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = runUpdateCheck().finally(() => {
    inFlightCheck = null;
  });

  return inFlightCheck;
};

export const useAppUpdate = () => {
  return {
    currentVersion,
    currentChannel,
    latestVersion: readonly(latestVersion),
    updateAvailable: readonly(updateAvailable),
    updateBannerText: readonly(updateBannerText),
    hasCheckedForUpdate: readonly(hasCheckedForUpdate),
    isCheckingForUpdate: readonly(isCheckingForUpdate),
    updateCheckError: readonly(updateCheckError),
    checkForAppUpdate,
  };
};
