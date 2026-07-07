import { isTauriApp } from "@/utils/system/tauri";

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

type HttpInvokeResult = {
  base64_data: string;
  file_name: string;
  mime_type: string;
  status: number;
  url: string;
};

type HttpInvokeRequest = {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
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

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const headersToRecord = (headers: HeadersInit | undefined): Record<string, string> | undefined => {
  if (!headers) return undefined;
  const record: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    record[key] = value;
  });
  return record;
};

const requestViaBrowser = async (
  url: string,
  options: HttpTransportOptions,
): Promise<HttpTransportResponse> => {
  const response = await fetch(url, {
    body: options.body,
    cache: options.cache,
    credentials: options.credentials,
    headers: options.headers,
    method: options.method,
  });
  if (!response.ok && !options.allowHttpError) {
    throw new Error(`HTTP 请求失败（HTTP ${response.status}）`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
    ok: response.ok,
    status: response.status,
    url: response.url || url,
  };
};

const requestViaTauri = async (
  url: string,
  options: HttpTransportOptions,
): Promise<HttpTransportResponse> => {
  const { invoke } = await import("@tauri-apps/api/core");
  const request: HttpInvokeRequest = {
    body: options.body,
    headers: headersToRecord(options.headers),
    method: options.method,
    url,
  };
  const result = await invoke<HttpInvokeResult>("request_http", { request });

  const base64Data = String(result?.base64_data || "").trim();
  const status = Number(result?.status || 200);
  if (!base64Data && !options.allowHttpError) {
    throw new Error("HTTP 请求失败：响应数据为空");
  }
  if ((status < 200 || status >= 300) && !options.allowHttpError) {
    throw new Error(`HTTP 请求失败（HTTP ${status}）`);
  }

  return {
    bytes: base64ToBytes(base64Data),
    contentType: String(result?.mime_type || "").trim() || null,
    ok: status >= 200 && status < 300,
    status,
    url: String(result?.url || url),
  };
};

/**
 * Sends an HTTP request using browser fetch, or Tauri's desktop backend when available.
 */
export const requestHttp = async (
  url: string,
  options: HttpTransportOptions = {},
): Promise<HttpTransportResponse> => {
  if (
    options.preferDesktopBackend !== false &&
    isTauriApp() &&
    shouldUseDesktopBackend(url)
  ) {
    return requestViaTauri(url, options);
  }

  return requestViaBrowser(url, options);
};

/** Decodes an HTTP response body as UTF-8 text. */
export const requestText = async (
  url: string,
  options: HttpTransportOptions = {},
): Promise<Omit<HttpTransportResponse, "bytes"> & { data: string }> => {
  const response = await requestHttp(url, options);
  return {
    ...response,
    data: new TextDecoder().decode(response.bytes),
  };
};
