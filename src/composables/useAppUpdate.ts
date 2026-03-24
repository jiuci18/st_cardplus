import { getSetting, setSetting } from '@/utils/localStorageUtils';
import { computed, readonly, ref } from 'vue';

type AppChannel = 'stable' | 'dev';
type UpdateKind = 'version' | 'commit';
type UpdateBranch = 'main' | 'dev';

interface UpdateMetadata {
  version?: string;
  commitHash?: string;
  updateTitle?: string;
  updateDescription?: string;
  buildTime?: string;
}

const DEFAULT_UPDATE_BRANCH: UpdateBranch = 'main';

const CHANNEL_BRANCH_MAP: Record<AppChannel, UpdateBranch> = {
  stable: 'main',
  dev: 'dev',
};

const UPDATE_METADATA_URLS: Record<UpdateBranch, string> = {
  main: 'https://cardplus.jiuci.top/metadata.json',
  dev: 'https://dev.st-cardplus-1kl.pages.dev/metadata.json',
};

const UPDATE_GUIDE_URLS: Record<UpdateBranch, string> = {
  main: 'https://nightly.link/jiuci18/st_cardplus/workflows/build/main',
  dev: 'https://nightly.link/jiuci18/st_cardplus/workflows/build/dev',
};

const currentVersion = __APP_SEMVER__;
const currentCommitHash = __APP_VERSION__;
const currentChannel: AppChannel = __APP_CHANNEL__ === 'stable' ? 'stable' : 'dev';
const resolvedUpdateBranch = ref<UpdateBranch>(CHANNEL_BRANCH_MAP[currentChannel]);
const updateGuideUrl = computed(() => UPDATE_GUIDE_URLS[resolvedUpdateBranch.value] ?? UPDATE_GUIDE_URLS[DEFAULT_UPDATE_BRANCH]);

const latestVersion = ref('');
const latestCommitHash = ref('');
const latestBuildTime = ref('');
const latestUpdateTitle = ref('');
const latestUpdateDescription = ref('');
const detectedUpdateAvailable = ref(false);
const hasCheckedForUpdate = ref(false);
const isCheckingForUpdate = ref(false);
const updateCheckError = ref<string | null>(null);
const updateKind = ref<UpdateKind | null>(null);
const ignoredUntil = ref(getSetting('updateIgnoreUntil'));

const getUpdateBranchesToTry = (channel: AppChannel) => {
  const preferredBranch = CHANNEL_BRANCH_MAP[channel];
  return preferredBranch === DEFAULT_UPDATE_BRANCH ? [preferredBranch] : [preferredBranch, DEFAULT_UPDATE_BRANCH];
};

const isUpdateIgnored = computed(() => {
  if (ignoredUntil.value === 'permanent') return true;
  if (!ignoredUntil.value) return false;
  const ignoredUntilTime = new Date(ignoredUntil.value).getTime();
  return Number.isFinite(ignoredUntilTime) && ignoredUntilTime > Date.now();
});

const updateAvailable = computed(() => detectedUpdateAvailable.value && !isUpdateIgnored.value);

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

const setIgnoredUntil = (value: string) => {
  ignoredUntil.value = value;
  setSetting('updateIgnoreUntil', value);
};

const applyRemoteMetadata = (metadata: UpdateMetadata) => {
  const remoteVersion = metadata.version?.trim();

  if (!remoteVersion) {
    throw new Error('metadata version is missing');
  }

  latestVersion.value = remoteVersion;
  latestCommitHash.value = metadata.commitHash?.trim() ?? '';
  latestBuildTime.value = metadata.buildTime?.trim() ?? '';
  latestUpdateTitle.value = metadata.updateTitle?.trim() ?? '';
  latestUpdateDescription.value = metadata.updateDescription?.trim() ?? '';

  return {
    remoteVersion,
    remoteCommitHash: latestCommitHash.value,
  };
};

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

const resolveUpdateKind = (remoteVersion: string, remoteCommitHash: string): UpdateKind | null => {
  const comparisonResult = compareVersions(remoteVersion, currentVersion);

  if (comparisonResult > 0) {
    return 'version';
  }

  if (comparisonResult === 0 && remoteCommitHash && remoteCommitHash !== currentCommitHash) {
    return 'commit';
  }

  return null;
};

const setDetectedUpdate = (kind: UpdateKind | null) => {
  updateKind.value = kind;
  detectedUpdateAvailable.value = kind !== null;
};

const runUpdateCheck = async () => {
  isCheckingForUpdate.value = true;
  updateCheckError.value = null;

  try {
    const branchesToTry = getUpdateBranchesToTry(currentChannel);
    let lastError: Error | null = null;

    for (const branch of branchesToTry) {
      try {
        const response = await fetch(UPDATE_METADATA_URLS[branch], { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`metadata request failed with status ${response.status}`);
        }

        const metadata = (await response.json()) as UpdateMetadata;
        const { remoteVersion, remoteCommitHash } = applyRemoteMetadata(metadata);
        resolvedUpdateBranch.value = branch;
        setDetectedUpdate(resolveUpdateKind(remoteVersion, remoteCommitHash));
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('unknown error');
      }
    }

    resolvedUpdateBranch.value = DEFAULT_UPDATE_BRANCH;
    throw lastError ?? new Error('unknown error');
  } catch (error) {
    updateCheckError.value = error instanceof Error ? error.message : 'unknown error';
    setDetectedUpdate(null);
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
    setIgnoredUntil('permanent');
    return;
  }

  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const expiresAt = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
  setIgnoredUntil(expiresAt);
};

const clearIgnoredAppUpdate = () => {
  setIgnoredUntil('');
};

const appUpdate = {
  currentVersion,
  currentCommitHash,
  currentChannel,
  updateGuideUrl: readonly(updateGuideUrl),
  resolvedUpdateBranch: readonly(resolvedUpdateBranch),
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

export const useAppUpdate = () => appUpdate;
