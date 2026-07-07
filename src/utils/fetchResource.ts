import { requestHttp, type HttpTransportOptions } from "@/utils/httpTransport";

export interface FetchResourceBaseOptions extends HttpTransportOptions {}

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
  FetchBytesOptions | FetchTextOptions | FetchBlobOptions | FetchJsonOptions;

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
  const response = await requestHttp(url, options);
  const fileName = fileNameFromUrl(url);
  const mimeType = normalizeMimeType(response.contentType, fileName);

  return {
    data: resolveData<T>(response.bytes, mimeType, options, response.url),
    fileName,
    mimeType,
    ok: response.ok,
    status: response.status,
    url: response.url,
  };
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
 * Downloads remote content as JSON.
 */
export const fetchJsonResource = async <T = unknown>(
  url: string,
  options: FetchResourceBaseOptions = {},
): Promise<FetchResourceResponse<T>> =>
  fetchResource<T>(url, { ...options, as: "json" });
