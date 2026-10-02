const encoder = new TextEncoder();
// Reuse a bounded buffer instead of allocating the full UTF-8 backup just to count it.
let scratch: Uint8Array | undefined;

export function utf8ByteLength(text: string): number {
  if (text.length === 0) return 0;
  const buffer = (scratch ??= new Uint8Array(16 * 1024));
  let offset = 0;
  let bytes = 0;
  while (offset < text.length) {
    const { read, written } = encoder.encodeInto(text.slice(offset), buffer);
    offset += read;
    bytes += written;
  }
  return bytes;
}

const BYTE_UNITS = ["Bytes", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "未知";
  if (bytes === 0) return "0 Bytes";
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / Math.pow(1024, unitIndex);
  return `${Number(value.toFixed(Math.max(0, decimals)))} ${BYTE_UNITS[unitIndex]}`;
}

// Native Base64 avoids building a binary string on recent browsers/WebViews.
// Keep fallbacks for older Tauri WebViews without these typed-array APIs.
type Base64Bytes = Uint8Array & { toBase64?: () => string };
type Base64Constructor = typeof Uint8Array & {
  fromBase64?: (value: string) => Uint8Array;
};

export function bytesToBase64(bytes: Uint8Array): string {
  const native = (bytes as Base64Bytes).toBase64;
  if (native) return native.call(bytes);

  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const native = (Uint8Array as Base64Constructor).fromBase64;
  if (native) return native.call(Uint8Array, value);

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Blob already snapshots its input; do not copy ordinary ArrayBuffers first. */
export function bytesToBlob(bytes: Uint8Array, mimeType: string): Blob {
  const view =
    bytes.buffer instanceof ArrayBuffer
      ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : new Uint8Array(bytes); // Blob does not accept SharedArrayBuffer views.
  return new Blob([view], { type: mimeType });
}
