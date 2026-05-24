export interface BinaryFetchResult {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}

export interface BinaryFetchOptions {
  cache?: RequestCache;
  expectImage?: boolean;
  preferDesktopBackend?: boolean;
}

const isTauriApp = (): boolean => {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
};

const isAssetUrl = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    /^asset:\/\//i.test(trimmed) ||
    /^https?:\/\/asset\.localhost\//i.test(trimmed)
  );
};

const isHttpUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value.trim());

const shouldUseDesktopBackend = (url: string): boolean =>
  isHttpUrl(url) && !isAssetUrl(url);

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const bytesToBlob = (bytes: Uint8Array, mimeType: string): Blob => {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  const arrayBuffer = copied.buffer.slice(
    copied.byteOffset,
    copied.byteOffset + copied.byteLength,
  );
  return new Blob([arrayBuffer], { type: mimeType });
};

const inferMimeFromName = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".json")) return "application/json";
  return "application/octet-stream";
};

const fileNameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split("/").filter(Boolean).pop()?.trim();
    return fileName || "download";
  } catch {
    return "download";
  }
};

const normalizeMimeType = (
  mimeType: string | null | undefined,
  fileName: string,
): string => {
  const normalized = String(mimeType || "")
    .split(";")[0]
    .trim();
  return normalized || inferMimeFromName(fileName);
};

const assertExpectedImage = (mimeType: string, url: string) => {
  if (
    mimeType &&
    mimeType !== "application/octet-stream" &&
    !mimeType.toLowerCase().startsWith("image/")
  ) {
    throw new Error(`链接返回的内容不是图片: ${url}`);
  }
};

const fetchBinaryViaBrowser = async (
  url: string,
  options: BinaryFetchOptions,
): Promise<BinaryFetchResult> => {
  const response = await fetch(url, { cache: options.cache });
  if (!response.ok) {
    throw new Error(`下载失败（HTTP ${response.status}）`);
  }

  const fileName = fileNameFromUrl(url);
  const mimeType = normalizeMimeType(
    response.headers.get("content-type"),
    fileName,
  );
  if (options.expectImage) {
    assertExpectedImage(mimeType, url);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    fileName,
    mimeType,
  };
};

const fetchBinaryViaTauri = async (
  url: string,
  options: BinaryFetchOptions,
): Promise<BinaryFetchResult> => {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{
    base64_data: string;
    file_name: string;
    mime_type: string;
  }>("fetch_binary", {
    url,
    expectImage: options.expectImage ?? false,
    expect_image: options.expectImage ?? false,
  });

  const base64Data = String(result?.base64_data || "").trim();
  if (!base64Data) {
    throw new Error("下载失败：响应数据为空");
  }

  const fileName = String(result?.file_name || "download").trim() || "download";
  const mimeType = normalizeMimeType(result?.mime_type, fileName);
  if (options.expectImage) {
    assertExpectedImage(mimeType, url);
  }

  return {
    bytes: base64ToBytes(base64Data),
    fileName,
    mimeType,
  };
};

export const fetchBinaryResource = async (
  url: string,
  options: BinaryFetchOptions = {},
): Promise<BinaryFetchResult> => {
  if (
    options.preferDesktopBackend !== false &&
    isTauriApp() &&
    shouldUseDesktopBackend(url)
  ) {
    return fetchBinaryViaTauri(url, options);
  }

  return fetchBinaryViaBrowser(url, options);
};

export const binaryFetchResultToBlob = (result: BinaryFetchResult): Blob =>
  bytesToBlob(result.bytes, result.mimeType);

export const fetchImageBlob = async (
  url: string,
  options: Omit<BinaryFetchOptions, "expectImage"> = {},
): Promise<Blob> => {
  const result = await fetchBinaryResource(url, {
    ...options,
    expectImage: true,
  });
  return binaryFetchResultToBlob(result);
};
