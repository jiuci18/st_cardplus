//! HTTP serialization, authentication headers, and error mapping for Barkeep.

import type { BarkeepConnectionConfig } from "@/types/barkeep";
import { requestText } from "../../httpTransport.ts";
import { BarkeepClientError } from "./errors.ts";

const STATUS_MESSAGES: Record<number, string> = {
  400: "请求参数不正确",
  401: "认证失败，请检查凭据",
  403: "请求被服务器拒绝",
  429: "登录尝试过于频繁，请稍后重试",
};

/** Normalize and validate a Barkeep HTTP base URL. */
export function normalizeBarkeepBaseUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BarkeepClientError("请输入有效的 Barkeep 服务地址");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BarkeepClientError("Barkeep 地址仅支持 HTTP 或 HTTPS");
  }
  return url.toString().replace(/\/+$/, "");
}

function basicAuthorization(config: BarkeepConnectionConfig): string | null {
  if (config.mode !== "sillytavern" || !config.basicAuth.enabled) return null;
  const bytes = new TextEncoder().encode(
    `${config.basicAuth.username}:${config.basicAuth.password}`,
  );
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `Basic ${btoa(binary)}`;
}

/** Build request headers with configured SillyTavern HTTP Basic credentials. */
export function createBarkeepHeaders(
  config: BarkeepConnectionConfig,
  additions?: Record<string, string>,
): Headers {
  const headers = new Headers(additions);
  const authorization = basicAuthorization(config);
  if (authorization) headers.set("Authorization", authorization);
  return headers;
}

function parseResponseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorDetail(body: unknown): string | null {
  if (typeof body === "string" && body.trim()) {
    return body
      .replace(/<[^>]*>/g, " ")
      .replace(/\[(?:\d{1,3};?)+m/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return null;
}

function requestBody(init: RequestInit): string | undefined {
  if (init.body === undefined || init.body === null) return undefined;
  if (typeof init.body === "string") return init.body;
  throw new BarkeepClientError(
    "Barkeep 请求仅支持字符串请求体",
    null,
    "validation",
  );
}

function assertOkResponse(status: number, ok: boolean, body: unknown): void {
  if (ok) return;

  const detail = errorDetail(body);
  if (
    status === 403 &&
    detail?.toLowerCase().includes("invalid csrf token")
  ) {
    throw new BarkeepClientError(
      "CSRF 会话无效：请刷新页面，并确保 CardPlus 与 SillyTavern 使用相同主机名（不要混用 localhost 和 127.0.0.1）",
      status,
      "csrf",
    );
  }
  if (status === 401 && detail?.toLowerCase().includes("bearer token")) {
    throw new BarkeepClientError(
      "该 Barkeep 连接已启用增强式安全，请填写 Barkeep API 密码后重新登录",
      status,
      "http",
    );
  }
  const summary = STATUS_MESSAGES[status] ?? `HTTP ${status}`;
  throw new BarkeepClientError(
    detail ? `${summary}：${detail}` : summary,
    status,
    "http",
  );
}

/** Send a Barkeep request and decode its successful JSON response. */
export async function requestBarkeepJson(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  try {
    const response = await requestText(url, {
      allowHttpError: true,
      body: requestBody(init),
      cache: init.cache,
      credentials: init.credentials,
      headers: init.headers,
      method: init.method,
    });
    const body = parseResponseBody(response.data);
    assertOkResponse(response.status, response.ok, body);
    return body;
  } catch (error) {
    if (error instanceof BarkeepClientError) throw error;
    const detail = error instanceof Error ? error.message : "未知网络错误";
    throw new BarkeepClientError(
      `网络连接失败：无法访问 Barkeep 服务（${detail}）`,
      null,
      "network",
    );
  }
}
