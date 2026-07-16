/** Barkeep HTTP transport selected by the user. */
export type BarkeepConnectionMode = "sillytavern" | "standalone";

/** SillyTavern resource type exposed by Barkeep's stable resource API. */
export type BarkeepResourceType = "characters" | "worlds" | "presets";

/**
 * Stable Barkeep mapping attached to an internal CardPlus resource.
 *
 * `uuid` is Barkeep's `file_mapping.uuid`; `path` is the SillyTavern
 * user-data relative path such as `characters/foo.png`,
 * `worlds/lore.json`, or `OpenAI Settings/preset.json`.
 */
export interface BarkeepResourceLink {
  uuid: string;
  path: string;
  user: string;
  type: BarkeepResourceType;
}

/** Optional HTTP Basic credentials used by SillyTavern router mode. */
export type BarkeepBasicAuth =
  | { enabled: false }
  | { enabled: true; username: string; password: string };

interface BarkeepConnectionBase {
  baseUrl: string;
  multiUser: boolean;
  handle: string;
  password: string;
  apiPassword?: string;
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
  | {
      mode: "sillytavern";
      token?: string | null;
      expiresAt?: number | null;
    }
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

/** A file exposed by Barkeep's remote resource directory. */
export interface BarkeepRemoteAsset {
  name: string;
  file: string;
  extension: string;
  size: number;
  updatedAt: string;
}

/** A remote preset together with its SillyTavern preset category. */
export interface BarkeepRemotePreset extends BarkeepRemoteAsset {
  category: string;
}

/** Resources relevant to CardPlus returned by Barkeep's status endpoint. */
export interface BarkeepRemoteDirectory {
  characters: BarkeepRemoteAsset[];
  worlds: BarkeepRemoteAsset[];
  presets: BarkeepRemotePreset[];
}

/** Validated status and remote directory returned by a Barkeep ping. */
export interface BarkeepStatus {
  user: string;
  mode: "single-user" | "multi-user";
  counts: BarkeepResourceCounts;
  resources: BarkeepRemoteDirectory;
}
