/** Barkeep HTTP transport selected by the user. */
export type BarkeepConnectionMode = "sillytavern" | "standalone";

/** Optional HTTP Basic credentials used by SillyTavern router mode. */
export type BarkeepBasicAuth =
  | { enabled: false }
  | { enabled: true; username: string; password: string };

interface BarkeepConnectionBase {
  baseUrl: string;
  multiUser: boolean;
  handle: string;
  password: string;
}

/** A validated Barkeep connection configuration. */
export type BarkeepConnectionConfig =
  | (BarkeepConnectionBase & {
      mode: "sillytavern";
      basicAuth: BarkeepBasicAuth;
    })
  | (BarkeepConnectionBase & {
      mode: "standalone";
      basicAuth: { enabled: false };
    });

/** Authentication state required for subsequent Barkeep requests. */
export type BarkeepSession =
  | { mode: "sillytavern" }
  | {
      mode: "standalone";
      token: string | null;
      expiresAt: number | null;
      authenticationEnabled: boolean;
    };

/** Resource counts returned by Barkeep's status endpoint. */
export interface BarkeepResourceCounts {
  characters: number;
  worlds: number;
  presets: number;
  characterChatGroups: number;
  characterChats: number;
  groupChats: number;
  chats: number;
}

/** Minimal validated status response used as the Barkeep ping result. */
export interface BarkeepStatus {
  user: string;
  mode: "single-user" | "multi-user";
  counts: BarkeepResourceCounts;
}
