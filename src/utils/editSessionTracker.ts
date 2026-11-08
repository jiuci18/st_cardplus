import { now, nowIso } from "./datetime.ts";

const EDIT_DIRECTORY_STORAGE_KEY = "ST_CARDPLUS_SESSION_EDIT_DIRECTORY";
export const EDIT_SESSION_CHANGED_EVENT = "edit-session-changed";

export type EditEntity =
  "characterCard" | "character" | "worldbook" | "preset" | "regex";

export interface EditSessionDirectory {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  /** 实体类型 -> 最近一次修改时间 */
  entities: Partial<Record<EditEntity, string>>;
}

const EDIT_ENTITIES: EditEntity[] = [
  "characterCard",
  "character",
  "worldbook",
  "preset",
  "regex",
];

const ENTITY_BY_STORAGE_KEY: Record<string, EditEntity> = {
  characterManagerData: "character",
  "regex-script-collection": "regex",
};

const ENTITY_BY_TABLE: Record<string, EditEntity> = {
  characterCards: "characterCard",
  books: "worldbook",
  entries: "worldbook",
  presets: "preset",
};

const isEditEntity = (value: string): value is EditEntity =>
  (EDIT_ENTITIES as string[]).includes(value);

const newId = (): string => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${now().getTime()}-${Math.random().toString(36).slice(2)}`;
};

const canUseSessionStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const createEmptyDirectory = (): EditSessionDirectory => {
  const now = nowIso();
  return {
    sessionId: newId(),
    startedAt: now,
    updatedAt: now,
    entities: {},
  };
};

const readDirectory = (): EditSessionDirectory => {
  if (!canUseSessionStorage()) return createEmptyDirectory();

  try {
    const raw = window.sessionStorage.getItem(EDIT_DIRECTORY_STORAGE_KEY);
    if (!raw) return createEmptyDirectory();
    const parsed = JSON.parse(raw) as Partial<EditSessionDirectory>;
    if (!parsed?.sessionId) return createEmptyDirectory();
    return {
      sessionId: parsed.sessionId,
      startedAt: parsed.startedAt ?? nowIso(),
      updatedAt: parsed.updatedAt ?? nowIso(),
      entities: Object.fromEntries(
        Object.entries(parsed.entities ?? {}).filter(
          (entry): entry is [EditEntity, string] =>
            typeof entry[1] === "string" && isEditEntity(entry[0]),
        ),
      ),
    };
  } catch (error) {
    console.error("Failed to read edit session directory:", error);
    return createEmptyDirectory();
  }
};

const writeDirectory = (directory: EditSessionDirectory): void => {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      EDIT_DIRECTORY_STORAGE_KEY,
      JSON.stringify(directory),
    );
    window.dispatchEvent(new Event(EDIT_SESSION_CHANGED_EVENT));
  } catch (error) {
    console.error("Failed to write edit session directory:", error);
  }
};

/** 只记录被修改的实体类型，不记录字段、条目或操作次数。 */
export const trackEntityEdit = (entity: EditEntity): void => {
  if (!canUseSessionStorage()) return;
  const directory = readDirectory();
  const at = nowIso();
  directory.entities[entity] = at;
  directory.updatedAt = at;
  writeDirectory(directory);
};

/** localStorage/sessionStorage 写入只关注实体相关的 key。 */
export const trackStorageEdit = (
  storage: "localStorage" | "sessionStorage",
  key?: string,
): void => {
  if (storage !== "localStorage" || !key) return;
  const entity = ENTITY_BY_STORAGE_KEY[key];
  if (entity) trackEntityEdit(entity);
};

/** IndexedDB 写入只关注实体相关的表。 */
export const trackIndexedDbEdit = (table: string): void => {
  const entity = ENTITY_BY_TABLE[table];
  if (entity) trackEntityEdit(entity);
};

/** Return the per-browser-session edit directory for local storage and IndexedDB writes. */
export const getEditSessionDirectory = (): EditSessionDirectory =>
  readDirectory();

/** Clear the per-browser-session edit directory without modifying application data. */
export const clearEditSessionDirectory = (): void => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(EDIT_DIRECTORY_STORAGE_KEY);
    window.dispatchEvent(new Event(EDIT_SESSION_CHANGED_EVENT));
  } catch (error) {
    console.error("Failed to clear edit session directory:", error);
  }
};
