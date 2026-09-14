const BYTE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '未知';
  if (bytes === 0) return '0 Bytes';

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const precision = Math.max(0, decimals);
  const value = bytes / Math.pow(1024, unitIndex);

  return `${Number(value.toFixed(precision))} ${BYTE_UNITS[unitIndex]}`;
}
