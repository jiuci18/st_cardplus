import { getSetting, setSetting } from '@/utils/localStorageUtils';
import { computed, readonly, ref } from 'vue';

type AppChannel = 'stable' | 'dev';

interface UpdateMetadata {
  version?: string;
  channel?: string;
  commitHash?: string;
  updateTitle?: string;
  updateDescription?: string;
  buildTime?: string;
}

const UPDATE_METADATA_URLS: Record<AppChannel, string> = {
  stable: 'https://cardplus.jiuci.top/metadata.json',
  dev: 'https://dev.st-cardplus-1kl.pages.dev/metadata.json',
};

const UPDATE_GUIDE_URLS: Record<AppChannel, string> = {
  stable: 'https://nightly.link/awaae001/st_cardplus/workflows/build/main',
  dev: 'https://nightly.link/awaae001/st_cardplus/workflows/build/dev',
};

const currentVersion = __APP_SEMVER__;
const currentCommitHash = __APP_VERSION__;
const currentChannel: AppChannel = __APP_CHANNEL__ === 'stable' ? 'stable' : 'dev';
const latestVersion = ref('');
const latestCommitHash = ref('');
const latestBuildTime = ref('');
const latestUpdateTitle = ref('');
const latestUpdateDescription = ref('');
const detectedUpdateAvailable = ref(false);
const hasCheckedForUpdate = ref(false);
const isCheckingForUpdate = ref(false);
const updateCheckError = ref<string | null>(null);
const updateKind = ref<'version' | 'commit' | null>(null);
const ignoredUntil = ref(getSetting('updateIgnoreUntil'));
const isUpdateIgnored = computed(() => {
  if (ignoredUntil.value === 'permanent') return true;
  if (!ignoredUntil.value) return false;
  const ignoredUntilTime = new Date(ignoredUntil.value).getTime();
  return Number.isFinite(ignoredUntilTime) && ignoredUntilTime > Date.now();
});
const updateAvailable = computed(() => detectedUpdateAvailable.value && !isUpdateIgnored.value);
const updateGuideUrl = UPDATE_GUIDE_URLS[currentChannel];
const updateBannerText = computed(() => {
  if (updateKind.value === 'version') {
    return latestVersion.value ? `请更新（v${latestVersion.value}）` : '请更新';
  }

  if (updateKind.value === 'commit') {
    return latestCommitHash.value ? `有更新可用（${latestCommitHash.value}）` : '有更新可用';
  }

  return '';
});
const updateNoteText = computed(() => {
  const title = latestUpdateTitle.value.trim();
  const description = latestUpdateDescription.value.trim();
  return title || description;
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
  const metadataUrl = UPDATE_METADATA_URLS[currentChannel];

  try {
    const response = await fetch(metadataUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`metadata request failed with status ${response.status}`);
    }

    const metadata = (await response.json()) as UpdateMetadata;
    const remoteVersion = metadata.version?.trim();
    const remoteCommitHash = metadata.commitHash?.trim() ?? '';
    const remoteBuildTime = metadata.buildTime?.trim() ?? '';
    const remoteUpdateTitle = metadata.updateTitle?.trim() ?? '';
    const remoteUpdateDescription = metadata.updateDescription?.trim() ?? '';

    if (!remoteVersion) {
      throw new Error('metadata version is missing');
    }

    latestVersion.value = remoteVersion;
    latestCommitHash.value = remoteCommitHash;
    latestBuildTime.value = remoteBuildTime;
    latestUpdateTitle.value = remoteUpdateTitle;
    latestUpdateDescription.value = remoteUpdateDescription;
    const comparisonResult = compareVersions(remoteVersion, currentVersion);
    if (comparisonResult > 0) {
      updateKind.value = 'version';
      detectedUpdateAvailable.value = true;
    } else if (comparisonResult === 0 && remoteCommitHash && remoteCommitHash !== currentCommitHash) {
      updateKind.value = 'commit';
      detectedUpdateAvailable.value = true;
    } else {
      updateKind.value = null;
      detectedUpdateAvailable.value = false;
    }
  } catch (error) {
    updateCheckError.value = error instanceof Error ? error.message : 'unknown error';
    updateKind.value = null;
    detectedUpdateAvailable.value = false;
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

const ignoreAppUpdateForDays = (days: number) => {
  if (days < 0) {
    ignoredUntil.value = 'permanent';
    setSetting('updateIgnoreUntil', 'permanent');
    return;
  }

  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const expiresAt = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
  ignoredUntil.value = expiresAt;
  setSetting('updateIgnoreUntil', expiresAt);
};

const clearIgnoredAppUpdate = () => {
  ignoredUntil.value = '';
  setSetting('updateIgnoreUntil', '');
};

export const useAppUpdate = () => {
  return {
    currentVersion,
    currentCommitHash,
    currentChannel,
    updateGuideUrl,
    latestVersion: readonly(latestVersion),
    latestCommitHash: readonly(latestCommitHash),
    latestBuildTime: readonly(latestBuildTime),
    latestUpdateTitle: readonly(latestUpdateTitle),
    latestUpdateDescription: readonly(latestUpdateDescription),
    detectedUpdateAvailable: readonly(detectedUpdateAvailable),
    updateAvailable: readonly(updateAvailable),
    updateKind: readonly(updateKind),
    updateBannerText: readonly(updateBannerText),
    updateNoteText: readonly(updateNoteText),
    ignoredUntil: readonly(ignoredUntil),
    isUpdateIgnored: readonly(isUpdateIgnored),
    hasCheckedForUpdate: readonly(hasCheckedForUpdate),
    isCheckingForUpdate: readonly(isCheckingForUpdate),
    updateCheckError: readonly(updateCheckError),
    checkForAppUpdate,
    ignoreAppUpdateForDays,
    clearIgnoredAppUpdate,
  };
};
