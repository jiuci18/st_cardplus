import type { BackupData } from '@/types/gist';
import type { SyncProvider, TransferProgress } from '@/types/dataSync';

export function formatErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function parseBackupData(provider: SyncProvider, payload: unknown): BackupData | null {
  if (provider === 'webdav') {
    return JSON.parse(String(payload)) as BackupData;
  }

  const result = payload as { success?: boolean; data?: BackupData };
  return result.success ? (result.data ?? null) : null;
}

function formatSpeedValue(bytesPerSecond: number | null): string {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '--';
  return (bytesPerSecond / 1024).toFixed(1);
}

function formatTotalSizeKB(total?: number, lengthComputable?: boolean): string {
  if (!lengthComputable || !total || !Number.isFinite(total) || total <= 0) return '-- KB';
  return `${(total / 1024).toFixed(1)} KB`;
}

export function formatDownloadProgressText(provider: SyncProvider, speed: number | null, progress: TransferProgress): string {
  const speedText = `${formatSpeedValue(speed)} KB/S : ${formatTotalSizeKB(progress.total, progress.lengthComputable)}`;
  return `正在从 ${provider} 下载... · ${speedText}`;
}

export function calculateJsonSizeBytes(data: unknown): number {
  return JSON.stringify(data).length;
}
