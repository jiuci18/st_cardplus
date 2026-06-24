import { isTauriApp } from "@/utils/system/tauri";

export interface FetchResourceBaseOptions {
  cache?: RequestCache;
  preferDesktopBackend?: boolean;
}

export interface FetchResourceMeta {
  fileName: string;
  mimeType: string;
  ok: boolean;
  status: number;
  url: string;
}

export interface FetchResourceResponse<T> extends FetchResourceMeta {
  data: T;
}

export interface FetchBytesOptions extends FetchResourceBaseOptions {
  as: "bytes";
}

export interface FetchTextOptions extends FetchResourceBaseOptions {
  as: "text";
}

export interface FetchBlobOptions extends FetchResourceBaseOptions {
  as: "blob";
}

export interface FetchJsonOptions extends FetchResourceBaseOptions {
  as: "json";
}

export type FetchResourceOptions =
  | FetchBytesOptions
  | FetchTextOptions
  | FetchBlobOptions
  | FetchJsonOptions;

type FetchHttpInvokeResult = {
  base64_data: string;
  file_name: string;
  mime_type: string;
  status: number;
  url: string;
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

const inferMimeFromName = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
};

const fileNameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
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

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
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

const bytesToText = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

const parseJsonText = <T>(text: string, url: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `解析 JSON 失败: ${error instanceof Error ? error.message : String(error)} (${url})`,
    );
  }
};

const resolveData = <T>(
  bytes: Uint8Array,
  mimeType: string,
  options: FetchResourceOptions,
  url: string,
): T => {
  switch (options.as) {
    case "bytes":
      return bytes as T;
    case "blob":
      return bytesToBlob(bytes, mimeType) as T;
    case "text":
      return bytesToText(bytes) as T;
    case "json":
      return parseJsonText<T>(bytesToText(bytes), url);
  }
};

const fetchViaBrowser = async <T>(
  url: string,
  options: FetchResourceOptions,
): Promise<FetchResourceResponse<T>> => {
  const response = await fetch(url, { cache: options.cache });
  if (!response.ok) {
    throw new Error(`下载失败（HTTP ${response.status}）`);
  }

  const fileName = fileNameFromUrl(url);
  const mimeType = normalizeMimeType(
    response.headers.get("content-type"),
    fileName,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());

  return {
    data: resolveData<T>(bytes, mimeType, options, url),
    fileName,
    mimeType,
    ok: response.ok,
    status: response.status,
    url: response.url || url,
  };
};

const fetchViaTauri = async <T>(
  url: string,
  options: FetchResourceOptions,
): Promise<FetchResourceResponse<T>> => {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<FetchHttpInvokeResult>("fetch_http", { url });

  const base64Data = String(result?.base64_data || "").trim();
  if (!base64Data) {
    throw new Error("下载失败：响应数据为空");
  }

  const fileName = String(result?.file_name || "download").trim() || "download";
  const mimeType = normalizeMimeType(result?.mime_type, fileName);
  const bytes = base64ToBytes(base64Data);

  return {
    data: resolveData<T>(bytes, mimeType, options, url),
    fileName,
    mimeType,
    ok: true,
    status: Number(result?.status || 200),
    url: String(result?.url || url),
  };
};

/**
 * Downloads remote content and returns parsed data plus basic response metadata.
 */
export async function fetchResource(
  url: string,
  options: FetchBytesOptions,
): Promise<FetchResourceResponse<Uint8Array>>;
export async function fetchResource(
  url: string,
  options: FetchTextOptions,
): Promise<FetchResourceResponse<string>>;
export async function fetchResource(
  url: string,
  options: FetchBlobOptions,
): Promise<FetchResourceResponse<Blob>>;
export async function fetchResource<T = unknown>(
  url: string,
  options: FetchJsonOptions,
): Promise<FetchResourceResponse<T>>;
export async function fetchResource<T>(
  url: string,
  options: FetchResourceOptions,
): Promise<FetchResourceResponse<T>> {
  if (
    options.preferDesktopBackend !== false &&
    isTauriApp() &&
    shouldUseDesktopBackend(url)
  ) {
    return fetchViaTauri<T>(url, options);
  }

  return fetchViaBrowser<T>(url, options);
}

/**
 * Downloads remote content as bytes.
 */
export const fetchBytesResource = async (
  url: string,
  options: FetchResourceBaseOptions = {},
): Promise<FetchResourceResponse<Uint8Array>> =>
  fetchResource(url, { ...options, as: "bytes" });

/**
 * Downloads remote content as text.
 */
export const fetchTextResource = async (
  url: string,
  options: FetchResourceBaseOptions = {},
): Promise<FetchResourceResponse<string>> =>
  fetchResource(url, { ...options, as: "text" });

/**
 * Downloads remote content as JSON.
 */
export const fetchJsonResource = async <T = unknown>(
  url: string,
  options: FetchResourceBaseOptions = {},
): Promise<FetchResourceResponse<T>> =>
  fetchResource<T>(url, { ...options, as: "json" });

/**
 * Downloads remote content as Blob.
 */
export const fetchBlobResource = async (
  url: string,
  options: FetchResourceBaseOptions = {},
): Promise<FetchResourceResponse<Blob>> =>
  fetchResource(url, { ...options, as: "blob" });
