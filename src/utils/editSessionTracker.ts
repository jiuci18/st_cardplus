import { now, nowIso } from "./datetime.ts";

const EDIT_DIRECTORY_STORAGE_KEY = "ST_CARDPLUS_SESSION_EDIT_DIRECTORY";
const MAX_EDIT_RECORDS = 500;
export const EDIT_SESSION_CHANGED_EVENT = "edit-session-changed";

export type EditSessionStorageKind = "localStorage" | "sessionStorage" | "indexedDB";

export type EditSessionOperation =
  | "set"
  | "remove"
  | "clear"
  | "create"
  | "update"
  | "delete";

export interface EditSessionRecord {
  id: string;
  storage: EditSessionStorageKind;
  operation: EditSessionOperation;
  target: string;
  key?: string;
  fields?: string[];
  updatedAt: string;
}

export interface EditSessionDirectoryEntry {
  storage: EditSessionStorageKind;
  target: string;
  operations: EditSessionOperation[];
  count: number;
  fields: string[];
  firstEditedAt: string;
  lastEditedAt: string;
}

export interface EditSessionDirectory {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  entries: Record<string, EditSessionDirectoryEntry>;
  records: EditSessionRecord[];
}

interface LocalStorageEditInput {
  storage: "localStorage" | "sessionStorage";
  operation: "set" | "remove" | "clear";
  key?: string;
}

interface IndexedDbEditInput {
  table: string;
  operation: "create" | "update" | "delete";
  primaryKey?: unknown;
  fields?: string[];
}

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
    entries: {},
    records: [],
  };
};

const isIgnoredEdit = (storage: EditSessionStorageKind, target?: string): boolean =>
  storage === "sessionStorage" || target === EDIT_DIRECTORY_STORAGE_KEY;

const readDirectory = (): EditSessionDirectory => {
  if (!canUseSessionStorage()) return createEmptyDirectory();

  try {
    const raw = window.sessionStorage.getItem(EDIT_DIRECTORY_STORAGE_KEY);
    if (!raw) return createEmptyDirectory();
    const parsed = JSON.parse(raw) as EditSessionDirectory;
    if (!parsed || typeof parsed !== "object" || !parsed.sessionId) {
      return createEmptyDirectory();
    }
    return {
      ...parsed,
      entries: Object.fromEntries(
        Object.entries(parsed.entries ?? {}).filter(([, entry]) => !isIgnoredEdit(entry.storage, entry.target)),
      ),
      records: Array.isArray(parsed.records)
        ? parsed.records.filter((record) => !isIgnoredEdit(record.storage, record.target))
        : [],
    };
  } catch (error) {
    console.error("Failed to read edit session directory:", error);
    return createEmptyDirectory();
  }
};

const writeDirectory = (directory: EditSessionDirectory): void => {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(EDIT_DIRECTORY_STORAGE_KEY, JSON.stringify(directory));
    window.dispatchEvent(new Event(EDIT_SESSION_CHANGED_EVENT));
  } catch (error) {
    console.error("Failed to write edit session directory:", error);
  }
};

const mergeFields = (left: string[], right: string[]): string[] =>
  Array.from(new Set([...left, ...right])).sort();

const appendRecord = (record: Omit<EditSessionRecord, "id" | "updatedAt">): void => {
  const directory = readDirectory();
  const updatedAt = nowIso();
  const nextRecord: EditSessionRecord = {
    ...record,
    id: newId(),
    updatedAt,
  };
  const targetKey = `${record.storage}:${record.target}`;
  const current = directory.entries[targetKey];
  const fields = record.fields ?? [];

  directory.entries[targetKey] = current
    ? {
      ...current,
      operations: Array.from(new Set([...current.operations, record.operation])),
      count: current.count + 1,
      fields: mergeFields(current.fields, fields),
      lastEditedAt: updatedAt,
    }
    : {
      storage: record.storage,
      target: record.target,
      operations: [record.operation],
      count: 1,
      fields: fields.slice().sort(),
      firstEditedAt: updatedAt,
      lastEditedAt: updatedAt,
    };

  directory.records = [...directory.records, nextRecord].slice(-MAX_EDIT_RECORDS);
  directory.updatedAt = updatedAt;
  writeDirectory(directory);
};

/** Return the per-browser-session edit directory for local storage and IndexedDB writes. */
export const getEditSessionDirectory = (): EditSessionDirectory => readDirectory();

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

/** Record a localStorage mutation; sessionStorage is UI/session state, not an edit. */
export const trackStorageEdit = (input: LocalStorageEditInput): void => {
  if (isIgnoredEdit(input.storage, input.key)) return;

  appendRecord({
    storage: input.storage,
    operation: input.operation,
    target: input.key ?? input.storage,
    key: input.key,
  });
};

/** Record an IndexedDB mutation in the current edit session. */
export const trackIndexedDbEdit = (input: IndexedDbEditInput): void => {
  appendRecord({
    storage: "indexedDB",
    operation: input.operation,
    target:
      input.primaryKey === undefined || input.primaryKey === null
        ? input.table
        : `${input.table}/${String(input.primaryKey)}`,
    key: input.primaryKey === undefined || input.primaryKey === null ? undefined : String(input.primaryKey),
    fields: input.fields,
  });
};
