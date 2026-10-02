import { isTauriApp } from "./system/tauri.ts";
import { base64ToBytes, bytesToBlob } from "./binary.ts";

export interface HttpTransportOptions {
  allowHttpError?: boolean;
  body?: string;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  method?: string;
  preferDesktopBackend?: boolean;
}

export interface HttpTransportResponse {
  bytes: Uint8Array;
  ok: boolean;
  status: number;
  url: string;
  contentType: string | null;
}

/** Browser and desktop HTTP share one response/error contract. */
export async function requestHttp(
  url: string,
  options: HttpTransportOptions = {},
): Promise<HttpTransportResponse> {
  const trimmed = url.trim();
  let response: HttpTransportResponse;
  if (
    options.preferDesktopBackend !== false &&
    isTauriApp() &&
    /^https?:\/\//i.test(trimmed) &&
    !/^https?:\/\/asset\.localhost\//i.test(trimmed)
  ) {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<{
      base64_data: string;
      mime_type: string;
      status: number;
      url: string;
    }>("request_http", {
      request: {
        body: options.body,
        headers: options.headers
          ? Object.fromEntries(new Headers(options.headers))
          : undefined,
        method: options.method,
        url,
      },
    });
    const base64 = String(result?.base64_data || "").trim();
    const status = Number(result?.status || 200);
    if (!base64 && !options.allowHttpError) {
      throw new Error("HTTP 请求失败：响应数据为空");
    }
    // Check status before decoding, preserving the desktop error precedence.
    if ((status < 200 || status >= 300) && !options.allowHttpError) {
      throw new Error(`HTTP 请求失败（HTTP ${status}）`);
    }
    response = {
      bytes: base64ToBytes(base64),
      contentType: String(result?.mime_type || "").trim() || null,
      ok: status >= 200 && status < 300,
      status,
      url: String(result?.url || url),
    };
  } else {
    const result = await fetch(url, {
      body: options.body,
      cache: options.cache,
      credentials: options.credentials,
      headers: options.headers,
      method: options.method,
    });
    if (!result.ok && !options.allowHttpError) {
      throw new Error(`HTTP 请求失败（HTTP ${result.status}）`);
    }
    response = {
      bytes: new Uint8Array(await result.arrayBuffer()),
      contentType: result.headers.get("content-type"),
      ok: result.ok,
      status: result.status,
      url: result.url || url,
    };
  }
  return response;
}

export async function requestText(
  url: string,
  options: HttpTransportOptions = {},
): Promise<Omit<HttpTransportResponse, "bytes"> & { data: string }> {
  const { bytes, ...response } = await requestHttp(url, options);
  return { ...response, data: new TextDecoder().decode(bytes) };
}

export interface FetchResourceResponse<T> {
  data: T;
  fileName: string;
  mimeType: string;
  ok: boolean;
  status: number;
  url: string;
}

type ResourceType = "bytes" | "text" | "blob" | "json";
type FetchResourceOptions<T extends ResourceType = ResourceType> =
  HttpTransportOptions & { as: T };

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

export function fetchResource(
  url: string,
  options: FetchResourceOptions<"bytes">,
): Promise<FetchResourceResponse<Uint8Array>>;
export function fetchResource(
  url: string,
  options: FetchResourceOptions<"text">,
): Promise<FetchResourceResponse<string>>;
export function fetchResource(
  url: string,
  options: FetchResourceOptions<"blob">,
): Promise<FetchResourceResponse<Blob>>;
export function fetchResource<T = unknown>(
  url: string,
  options: FetchResourceOptions<"json">,
): Promise<FetchResourceResponse<T>>;
export async function fetchResource<T>(
  url: string,
  options: FetchResourceOptions,
): Promise<FetchResourceResponse<T>> {
  const response = await requestHttp(url, options);
  let fileName = "download";
  try {
    fileName =
      new URL(url, window.location.origin).pathname
        .split("/")
        .filter(Boolean)
        .pop()
        ?.trim() || fileName;
  } catch {
    /* Keep the fallback name for malformed URLs. */
  }
  const mimeType =
    String(response.contentType || "")
      .split(";")[0]
      .trim() || inferMimeFromName(fileName);
  let data: unknown;
  switch (options.as) {
    case "bytes":
      data = response.bytes;
      break;
    case "blob":
      data = bytesToBlob(response.bytes, mimeType);
      break;
    case "text":
      data = new TextDecoder().decode(response.bytes);
      break;
    case "json":
      try {
        data = JSON.parse(new TextDecoder().decode(response.bytes));
      } catch (error) {
        throw new Error(
          `解析 JSON 失败: ${error instanceof Error ? error.message : String(error)} (${response.url})`,
        );
      }
  }
  return {
    data: data as T,
    fileName,
    mimeType,
    ok: response.ok,
    status: response.status,
    url: response.url,
  };
}

export const fetchJsonResource = <T = unknown>(
  url: string,
  options: HttpTransportOptions = {},
) => fetchResource<T>(url, { ...options, as: "json" });

/** Downloads and validates an image without an intermediate binary-result wrapper. */
export async function fetchImageBlob(
  url: string,
  options: HttpTransportOptions = {},
): Promise<Blob> {
  const result = await fetchResource(url, { ...options, as: "bytes" });
  if (
    result.mimeType &&
    result.mimeType !== "application/octet-stream" &&
    !result.mimeType.toLowerCase().startsWith("image/")
  ) {
    throw new Error(`链接返回的内容不是图片: ${result.url}`);
  }
  return bytesToBlob(result.data, result.mimeType);
}
