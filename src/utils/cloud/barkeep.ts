//! Browser client for Barkeep authentication and status probing.

import { requestText } from "@/utils/httpTransport";
import type {
  BarkeepConnectionConfig,
  BarkeepResourceCounts,
  BarkeepSession,
  BarkeepStatus,
} from "@/types/barkeep";

interface LoginResponse {
  enabled?: unknown;
  token?: unknown;
  expiresIn?: unknown;
}

function readLoginResponse(body: unknown): {
  authenticationEnabled: boolean;
  token: string | null;
  expiresAt: number | null;
} {
  const result = (body ?? {}) as LoginResponse;
  const authenticationEnabled = result.enabled === true;
  const token = typeof result.token === "string" ? result.token : null;
  if (authenticationEnabled && !token) {
    throw new BarkeepClientError(
      "Barkeep 已启用认证但未返回访问令牌",
      null,
      "invalid-response",
    );
  }
  const expiresIn =
    typeof result.expiresIn === "number" && result.expiresIn > 0
      ? result.expiresIn
      : null;

  return {
    authenticationEnabled,
    token,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  };
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "请求参数不正确",
  401: "认证失败，请检查凭据",
  403: "请求被服务器拒绝",
  429: "登录尝试过于频繁，请稍后重试",
};

/** Stable category for a Barkeep client failure. */
export type BarkeepClientErrorCode =
  | "http"
  | "cors"
  | "csrf"
  | "network"
  | "validation"
  | "invalid-response";

/** Error raised for a failed Barkeep HTTP request. */
export class BarkeepClientError extends Error {
  /** HTTP status code, or null for browser/network failures. */
  readonly status: number | null;

  /** Machine-readable failure category. */
  readonly code: BarkeepClientErrorCode;

  constructor(
    message: string,
    status: number | null = null,
    code: BarkeepClientErrorCode = status === null ? "validation" : "http",
  ) {
    super(message);
    this.name = "BarkeepClientError";
    this.status = status;
    this.code = code;
  }
}

function normalizeBaseUrl(raw: string): string {
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

function requestHeaders(
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
  if (
    status === 401 &&
    detail?.toLowerCase().includes("bearer token")
  ) {
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

async function requestJsonViaTransport(
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

function assertCookieHostCompatibility(config: BarkeepConnectionConfig): void {
  if (
    config.mode !== "sillytavern" ||
    typeof window === "undefined" ||
    !window.location.hostname
  ) {
    return;
  }

  const pageHost = window.location.hostname;
  const serviceHost = new URL(normalizeBaseUrl(config.baseUrl)).hostname;
  const localAliases = new Set(["localhost", "127.0.0.1", "::1"]);
  if (
    pageHost !== serviceHost &&
    localAliases.has(pageHost) &&
    localAliases.has(serviceHost)
  ) {
    throw new BarkeepClientError(
      `SillyTavern 内嵌登录必须使用相同主机名：当前页面是 ${pageHost}，服务地址却是 ${serviceHost}`,
      null,
      "csrf",
    );
  }
}

async function requestJson(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  return requestJsonViaTransport(url, init);
}

function effectiveUser(config: BarkeepConnectionConfig): string {
  return config.multiUser ? config.handle.trim() : "default-user";
}

function assertCredentials(config: BarkeepConnectionConfig): void {
  normalizeBaseUrl(config.baseUrl);
  if (config.multiUser && !config.handle.trim()) {
    throw new BarkeepClientError("请输入用户 Handle");
  }
  if (config.multiUser && !config.password) {
    throw new BarkeepClientError("请输入用户密码");
  }
  if (config.mode === "sillytavern" && config.basicAuth.enabled) {
    if (!config.basicAuth.username.trim() || !config.basicAuth.password) {
      throw new BarkeepClientError("请输入完整的 HTTP Basic 凭据");
    }
  }
}

function getSillyTavernApiPassword(config: BarkeepConnectionConfig): string {
  if (config.mode !== "sillytavern") {
    return "";
  }
  return config.multiUser
    ? (config.apiPassword ?? "").trim()
    : config.password;
}

function readStatus(body: unknown): BarkeepStatus {
  if (!body || typeof body !== "object") {
    throw new BarkeepClientError(
      "Barkeep Ping 返回了无效响应",
      null,
      "invalid-response",
    );
  }
  const value = body as Record<string, unknown>;
  const counts = value.counts;
  if (
    typeof value.user !== "string" ||
    (value.mode !== "single-user" && value.mode !== "multi-user") ||
    !counts ||
    typeof counts !== "object"
  ) {
    throw new BarkeepClientError(
      "Barkeep Ping 响应缺少必要字段",
      null,
      "invalid-response",
    );
  }

  const source = counts as Record<string, unknown>;
  const keys: Array<keyof BarkeepResourceCounts> = [
    "characters",
    "worlds",
    "presets",
    "characterChatGroups",
    "characterChats",
    "groupChats",
    "chats",
  ];
  const normalized = {} as BarkeepResourceCounts;
  for (const key of keys) {
    if (typeof source[key] !== "number") {
      throw new BarkeepClientError(
        "Barkeep Ping 响应包含无效资源计数",
        null,
        "invalid-response",
      );
    }
    normalized[key] = source[key];
  }

  return {
    user: value.user,
    mode: value.mode,
    counts: normalized,
  };
}

/** Authenticate with Barkeep using the selected transport contract. */
export async function loginToBarkeep(
  config: BarkeepConnectionConfig,
): Promise<BarkeepSession> {
  assertCredentials(config);
  assertCookieHostCompatibility(config);
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  if (config.mode === "sillytavern") {
    const csrfBody = await requestJson(`${baseUrl}/csrf-token`, {
      method: "GET",
      credentials: "include",
      headers: requestHeaders(config),
    });
    const csrfToken =
      csrfBody &&
      typeof csrfBody === "object" &&
      "token" in csrfBody &&
      typeof csrfBody.token === "string"
        ? csrfBody.token
        : null;
    if (!csrfToken) {
      throw new BarkeepClientError(
        "SillyTavern 未返回 CSRF Token",
        null,
        "invalid-response",
      );
    }

    if (config.multiUser) {
      await requestJson(`${baseUrl}/api/users/login`, {
        method: "POST",
        credentials: "include",
        headers: requestHeaders(config, {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        }),
        body: JSON.stringify({
          handle: config.handle.trim(),
          password: config.password,
        }),
      });
    }

    const apiPassword = getSillyTavernApiPassword(config);
    if (!apiPassword) {
      return { mode: "sillytavern", token: null, expiresAt: null };
    }

    const body = await requestJson(`${baseUrl}/api/plugins/barkeep/v1/login`, {
      method: "POST",
      credentials: "include",
      headers: requestHeaders(config, {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      }),
      body: JSON.stringify({ password: apiPassword }),
    });
    const { token, expiresAt } = readLoginResponse(body);
    return { mode: "sillytavern", token, expiresAt };
  }

  const body = await requestJson(`${baseUrl}/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      config.multiUser
        ? { handle: config.handle.trim(), password: config.password }
        : { password: config.password },
    ),
  });
  const { authenticationEnabled, token, expiresAt } = readLoginResponse(body);

  return {
    mode: "standalone",
    token,
    expiresAt,
    authenticationEnabled,
  };
}

/** Probe Barkeep's status endpoint with an established session. */
export async function pingBarkeep(
  config: BarkeepConnectionConfig,
  session: BarkeepSession,
): Promise<BarkeepStatus> {
  assertCredentials(config);
  if (config.mode !== session.mode) {
    throw new BarkeepClientError("连接配置已变化，请重新登录");
  }
  if (
    session.expiresAt !== undefined &&
    session.expiresAt !== null &&
    session.expiresAt <= Date.now()
  ) {
    throw new BarkeepClientError("Barkeep 登录令牌已过期，请重新登录", 401);
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const user = encodeURIComponent(effectiveUser(config));
  const path =
    config.mode === "sillytavern"
      ? `/api/plugins/barkeep/v1/${user}/status/list`
      : `/v1/${user}/status/list`;
  const headers = requestHeaders(config);
  if (session.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const body = await requestJson(`${baseUrl}${path}`, {
    method: "GET",
    credentials: config.mode === "sillytavern" ? "include" : "same-origin",
    headers,
  });
  return readStatus(body);
}
