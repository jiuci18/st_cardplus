//! Runtime validation for Barkeep login and status responses.

import type {
  BarkeepRemoteAsset,
  BarkeepRemotePreset,
  BarkeepResourceCounts,
  BarkeepStatus,
} from "@/types/barkeep";
import { BarkeepClientError } from "./errors.ts";

interface LoginResponse {
  enabled?: unknown;
  token?: unknown;
  expiresIn?: unknown;
}

/** Validated authentication fields returned by Barkeep login. */
export interface BarkeepLoginResult {
  authenticationEnabled: boolean;
  token: string | null;
  expiresAt: number | null;
}

/** Validate and normalize a Barkeep login response. */
export function readBarkeepLoginResponse(body: unknown): BarkeepLoginResult {
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

function readRemoteAsset(body: unknown, context: string): BarkeepRemoteAsset {
  if (!body || typeof body !== "object") {
    throw new BarkeepClientError(
      `Barkeep Ping 响应中的${context}条目无效`,
      null,
      "invalid-response",
    );
  }

  const value = body as Record<string, unknown>;
  if (
    typeof value.name !== "string" ||
    typeof value.file !== "string" ||
    typeof value.extension !== "string" ||
    typeof value.size !== "number" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new BarkeepClientError(
      `Barkeep Ping 响应中的${context}条目缺少必要字段`,
      null,
      "invalid-response",
    );
  }

  return {
    name: value.name,
    file: value.file,
    extension: value.extension,
    size: value.size,
    updatedAt: value.updatedAt,
  };
}

function readRemoteAssets(body: unknown, context: string): BarkeepRemoteAsset[] {
  if (!Array.isArray(body)) {
    throw new BarkeepClientError(
      `Barkeep Ping 响应缺少${context}目录`,
      null,
      "invalid-response",
    );
  }
  return body.map((item) => readRemoteAsset(item, context));
}

function readRemotePresets(body: unknown): BarkeepRemotePreset[] {
  if (!body || typeof body !== "object") {
    throw new BarkeepClientError(
      "Barkeep Ping 响应缺少预设目录",
      null,
      "invalid-response",
    );
  }
  const all = (body as Record<string, unknown>).all;
  if (!Array.isArray(all)) {
    throw new BarkeepClientError(
      "Barkeep Ping 响应缺少完整预设目录",
      null,
      "invalid-response",
    );
  }
  return all.map((item) => {
    const asset = readRemoteAsset(item, "预设");
    const category = (item as Record<string, unknown>).category;
    if (typeof category !== "string") {
      throw new BarkeepClientError(
        "Barkeep Ping 响应中的预设条目缺少分类",
        null,
        "invalid-response",
      );
    }
    return { ...asset, category };
  });
}

/** Validate and normalize a Barkeep status response. */
export function readBarkeepStatus(body: unknown): BarkeepStatus {
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
    resources: {
      characters: readRemoteAssets(value.characters, "角色"),
      worlds: readRemoteAssets(value.worlds, "世界书"),
      presets: readRemotePresets(value.presets),
    },
  };
}
