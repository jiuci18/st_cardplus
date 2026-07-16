//! Public Barkeep client for authentication and status probing.

import type {
  BarkeepConnectionConfig,
  BarkeepSession,
  BarkeepStatus,
} from "@/types/barkeep";
import { BarkeepClientError } from "./barkeep/errors.ts";
import {
  createBarkeepHeaders,
  normalizeBarkeepBaseUrl,
  requestBarkeepJson,
} from "./barkeep/request.ts";
import {
  readBarkeepLoginResponse,
  readBarkeepStatus,
} from "./barkeep/response.ts";

export {
  BarkeepClientError,
  type BarkeepClientErrorCode,
} from "./barkeep/errors.ts";

function assertCookieHostCompatibility(config: BarkeepConnectionConfig): void {
  if (
    config.mode !== "sillytavern" ||
    typeof window === "undefined" ||
    !window.location.hostname
  ) {
    return;
  }

  const pageHost = window.location.hostname;
  const serviceHost = new URL(
    normalizeBarkeepBaseUrl(config.baseUrl),
  ).hostname;
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

function effectiveUser(config: BarkeepConnectionConfig): string {
  return config.multiUser ? config.handle.trim() : "default-user";
}

function assertCredentials(config: BarkeepConnectionConfig): void {
  normalizeBarkeepBaseUrl(config.baseUrl);
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
  if (config.mode !== "sillytavern") return "";
  return config.multiUser
    ? (config.apiPassword ?? "").trim()
    : config.password;
}

async function getSillyTavernCsrfToken(
  config: BarkeepConnectionConfig,
  baseUrl: string,
): Promise<string> {
  const body = await requestBarkeepJson(`${baseUrl}/csrf-token`, {
    method: "GET",
    credentials: "include",
    headers: createBarkeepHeaders(config),
  });
  const token =
    body &&
    typeof body === "object" &&
    "token" in body &&
    typeof body.token === "string"
      ? body.token
      : null;
  if (!token) {
    throw new BarkeepClientError(
      "SillyTavern 未返回 CSRF Token",
      null,
      "invalid-response",
    );
  }
  return token;
}

async function loginToSillyTavern(
  config: BarkeepConnectionConfig & { mode: "sillytavern" },
  baseUrl: string,
): Promise<BarkeepSession> {
  const csrfToken = await getSillyTavernCsrfToken(config, baseUrl);
  const jsonHeaders = {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };

  if (config.multiUser) {
    await requestBarkeepJson(`${baseUrl}/api/users/login`, {
      method: "POST",
      credentials: "include",
      headers: createBarkeepHeaders(config, jsonHeaders),
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

  const body = await requestBarkeepJson(
    `${baseUrl}/api/plugins/barkeep/v1/login`,
    {
      method: "POST",
      credentials: "include",
      headers: createBarkeepHeaders(config, jsonHeaders),
      body: JSON.stringify({ password: apiPassword }),
    },
  );
  const { token, expiresAt } = readBarkeepLoginResponse(body);
  return { mode: "sillytavern", token, expiresAt };
}

async function loginToStandalone(
  config: BarkeepConnectionConfig & { mode: "standalone" },
  baseUrl: string,
): Promise<BarkeepSession> {
  const body = await requestBarkeepJson(`${baseUrl}/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      config.multiUser
        ? { handle: config.handle.trim(), password: config.password }
        : { password: config.password },
    ),
  });
  const { authenticationEnabled, token, expiresAt } =
    readBarkeepLoginResponse(body);

  return {
    mode: "standalone",
    token,
    expiresAt,
    authenticationEnabled,
  };
}

/** Authenticate with Barkeep using the selected transport contract. */
export async function loginToBarkeep(
  config: BarkeepConnectionConfig,
): Promise<BarkeepSession> {
  assertCredentials(config);
  assertCookieHostCompatibility(config);
  const baseUrl = normalizeBarkeepBaseUrl(config.baseUrl);

  return config.mode === "sillytavern"
    ? loginToSillyTavern(config, baseUrl)
    : loginToStandalone(config, baseUrl);
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

  const baseUrl = normalizeBarkeepBaseUrl(config.baseUrl);
  const user = encodeURIComponent(effectiveUser(config));
  const path =
    config.mode === "sillytavern"
      ? `/api/plugins/barkeep/v1/${user}/status/list`
      : `/v1/${user}/status/list`;
  const headers = createBarkeepHeaders(config);
  if (session.token) headers.set("Authorization", `Bearer ${session.token}`);

  const body = await requestBarkeepJson(`${baseUrl}${path}`, {
    method: "GET",
    credentials: config.mode === "sillytavern" ? "include" : "same-origin",
    headers,
  });
  return readBarkeepStatus(body);
}
