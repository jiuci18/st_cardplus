import { ref } from 'vue';
import { worldBookService, type WorldBookStats } from '@/database/appdb/worldBookService';
import { characterCardService, type CharacterCardStats } from '@/database/appdb/characterCardService';
import { getLocalStorageSnapshot } from '@/utils/localStorageUtils';

export function useStorageInfo() {
  const indexedDBUsage = ref({
    percentage: 0,
    text: '加载中...',
  });

  const localStorageUsage = ref({
    percentage: 0,
    text: '加载中...',
  });

  const worldBookStats = ref<WorldBookStats | null>(null);
  const characterCardStats = ref<CharacterCardStats | null>(null);

  // 格式化字节大小
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // 获取存储信息
  const getStorageEstimate = async () => {
    const storageEstimatePromise =
      'storage' in navigator && 'estimate' in navigator.storage
        ? navigator.storage.estimate()
        : Promise.resolve<StorageEstimate | null>(null);

    const [worldStats, cardStats, estimate] = await Promise.all([
      worldBookService.getStats(),
      characterCardService.getStats(),
      storageEstimatePromise,
    ]);

    worldBookStats.value = worldStats;
    characterCardStats.value = cardStats;

    const totalApproxBytes = worldStats.approxBytes + cardStats.approxBytes;
    const quota = estimate?.quota ?? null;
    const reportedUsage = estimate?.usage ?? null;

    let percentage = 0;
    let displayText: string;

    if (quota && quota > 0) {
      const oneGB = 1024 * 1024 * 1024;
      // 如果配额大于 1GB，按 1GB 计算百分比和显示
      const effectiveQuota = quota > oneGB ? oneGB : quota;
      percentage = totalApproxBytes > 0 ? (totalApproxBytes / effectiveQuota) * 100 : 0;

      if (quota > oneGB) {
        displayText = `${formatBytes(totalApproxBytes)} / 1 GB+`;
      } else {
        displayText = `${formatBytes(totalApproxBytes)} / ${formatBytes(quota)}`;
      }
    } else if (reportedUsage && reportedUsage > 0) {
      displayText = `${formatBytes(totalApproxBytes)} · 浏览器总占用 ${formatBytes(reportedUsage)}`;
    } else {
      displayText = `约 ${formatBytes(totalApproxBytes)}`;
    }

    indexedDBUsage.value = {
      percentage: parseFloat(Math.min(percentage, 100).toFixed(2)),
      text: displayText,
    };
  };

  // 计算 LocalStorage 的大小
  const getLocalStorageUsage = () => {
    let totalBytes = 0;
    const byteSize = (value: string) => new Blob([value]).size;

    Object.entries(getLocalStorageSnapshot()).forEach(([key, value]) => {
      totalBytes += byteSize(key);
      if (value) totalBytes += byteSize(value);
    });

    // localStorage 的总配额，默认显示为 5MB
    const quota = 5 * 1024 * 1024;
    const percentage = Math.min((totalBytes / quota) * 100, 100);

    localStorageUsage.value = {
      percentage: parseFloat(percentage.toFixed(2)),
      text: `${formatBytes(totalBytes)} / 5 MB`,
    };
  };

  // 根据使用率返回颜色状态
  const getProgressStatus = (percentage: number): 'success' | 'warning' | 'exception' => {
    if (percentage >= 80) return 'exception';
    if (percentage >= 60) return 'warning';
    return 'success';
  };

  // 统一的存储信息更新函数
  const updateStorageInfo = async () => {
    await getStorageEstimate();
    getLocalStorageUsage();
  };

  return {
    indexedDBUsage,
    localStorageUsage,
    worldBookStats,
    characterCardStats,
    formatBytes,
    getProgressStatus,
    updateStorageInfo,
  };
}
