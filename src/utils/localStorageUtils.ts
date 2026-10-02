import {
  type MenuItemConfig,
  type MenuItemType,
  type SidebarConfig,
  createDefaultSidebarConfig,
  migrateMenuConfig,
  validateMenuConfig,
} from "../config/menuConfig.ts";
import { trackStorageEdit } from "./editSessionTracker.ts";
import type { WebDAVConfig } from "@/types/dataSync";
import type { GistConfig } from "@/types/gist";
import {
  createDefaultSyncConfigSettings,
  LEGACY_SYNC_CONFIG_KEYS,
  resolveSyncConfigSettings,
  SETTINGS_STORAGE_KEY,
} from "./syncConfigSettings.ts";

export type { MenuItemConfig, MenuItemType, SidebarConfig };

interface AppSettings {
  betaFeaturesEnabled: boolean;
  useNewWelcomePage: boolean;
  umamiEnabled: boolean;
  disableSyncSnapshotRecovery: boolean;
  autoSaveInterval: number;
  autoSaveDebounce: number;
  imgbbApiKey: string;
  defaultImageProvider: string;
  updateIgnoreUntil: string;
  autoExpandSidebar: boolean;
  mobileDominantHand: "left" | "right";
  pngImportUploadBehavior: "ask" | "upload" | "skip";
  sidebarConfig: SidebarConfig;
  webdavConfig: WebDAVConfig;
  gistConfig: GistConfig;
}

export type AppSettingsKey = keyof AppSettings;
type LocalStorageSnapshot = Record<string, string | null>;

// Access may throw in restricted browser contexts. Never cache the Storage object
// or its values: restores and writes from other tabs must remain visible.
const createStorageStore = (name: "localStorage" | "sessionStorage") => {
  const access = <T>(action: (storage: Storage) => T, fallback: T): T => {
    try {
      return action(window[name]);
    } catch (error) {
      console.error(`Failed to access ${name}:`, error);
      return fallback;
    }
  };
  const store = {
    get: (key: string): string | null =>
      access((storage) => storage.getItem(key), null),
    set: (key: string, value: string): void =>
      access((storage) => {
        if (storage.getItem(key) === value) return;
        storage.setItem(key, value);
        trackStorageEdit({ storage: name, operation: "set", key });
      }, undefined),
    remove: (key: string): void =>
      access((storage) => {
        if (storage.getItem(key) === null) return;
        storage.removeItem(key);
        trackStorageEdit({ storage: name, operation: "remove", key });
      }, undefined),
    clear: (): void =>
      access((storage) => {
        if (storage.length === 0) return;
        storage.clear();
        trackStorageEdit({ storage: name, operation: "clear" });
      }, undefined),
    readJSON: <T>(key: string): T | null =>
      access((storage) => {
        const value = storage.getItem(key);
        return value ? (JSON.parse(value) as T) : null;
      }, null),
    writeJSON: (key: string, value: unknown): void =>
      access(() => {
        store.set(key, JSON.stringify(value));
      }, undefined),
    entries: (): LocalStorageSnapshot => {
      const entries: LocalStorageSnapshot = {};
      return access((storage) => {
        for (let index = 0; index < storage.length; index++) {
          const key = storage.key(index);
          if (key !== null) {
            Object.defineProperty(entries, key, {
              value: storage.getItem(key),
              enumerable: true,
              configurable: true,
              writable: true,
            });
          }
        }
        return entries;
      }, entries);
    },
  };
  return store;
};

export const localStorageStore = createStorageStore("localStorage");
export const sessionStorageStore = createStorageStore("sessionStorage");
export const getSessionStorageItem = sessionStorageStore.get;
export const setSessionStorageItem = sessionStorageStore.set;
export const removeSessionStorageItem = sessionStorageStore.remove;
export const readLocalStorageJSON = localStorageStore.readJSON;
export const writeLocalStorageJSON = localStorageStore.writeJSON;
export const readSessionStorageJSON = sessionStorageStore.readJSON;
export const writeSessionStorageJSON = sessionStorageStore.writeJSON;

export const getLocalStorageSnapshot = (options?: {
  excludeKeys?: string[];
}): LocalStorageSnapshot => {
  const snapshot = localStorageStore.entries();
  for (const key of options?.excludeKeys ?? []) delete snapshot[key];
  return snapshot;
};

export const restoreLocalStorageSnapshot = (
  snapshot: LocalStorageSnapshot,
  options?: { preserveKeys?: string[] },
): void => {
  const preserved = (options?.preserveKeys ?? []).map(
    (key) => [key, localStorageStore.get(key)] as const,
  );
  localStorageStore.clear();
  for (const [key, value] of [...Object.entries(snapshot), ...preserved]) {
    if (value !== null) localStorageStore.set(key, value);
  }
};

const defaultSettings: AppSettings = {
  betaFeaturesEnabled: false,
  useNewWelcomePage: false,
  umamiEnabled: true,
  disableSyncSnapshotRecovery: false,
  autoSaveInterval: 5,
  autoSaveDebounce: 1.5,
  imgbbApiKey: "",
  defaultImageProvider: "",
  updateIgnoreUntil: "",
  autoExpandSidebar: true,
  mobileDominantHand: "right",
  pngImportUploadBehavior: "ask",
  sidebarConfig: createDefaultSidebarConfig(),
  ...createDefaultSyncConfigSettings(),
};

const normalizeSettingValue = <K extends AppSettingsKey>(
  key: K,
  value: AppSettings[K],
): AppSettings[K] => {
  if (key === "autoSaveInterval" || key === "autoSaveDebounce") {
    const number = Number(value);
    const safe = Number.isFinite(number)
      ? number
      : defaultSettings[key as "autoSaveInterval" | "autoSaveDebounce"];
    const [min, max] = key === "autoSaveInterval" ? [1, 60] : [0.1, 10];
    return Math.max(min, Math.min(max, safe)) as AppSettings[K];
  }
  if (key === "imgbbApiKey" || key === "updateIgnoreUntil") {
    return String(value ?? "").trim() as AppSettings[K];
  }
  if (key === "defaultImageProvider" || key === "pngImportUploadBehavior") {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return (
      key === "defaultImageProvider"
        ? ["catbox", "imgbb", "local"].includes(normalized)
          ? normalized
          : ""
        : ["upload", "skip"].includes(normalized)
          ? normalized
          : "ask"
    ) as AppSettings[K];
  }
  if (key === "mobileDominantHand")
    return (value === "left" ? "left" : "right") as AppSettings[K];
  if (key === "webdavConfig" || key === "gistConfig") {
    const settings = resolveSyncConfigSettings(
      { [key]: value },
      undefined,
      undefined,
    );
    return settings[key as "webdavConfig" | "gistConfig"] as AppSettings[K];
  }
  return value;
};

const getSettings = (): AppSettings => {
  try {
    const legacyWebDAV = readLocalStorageJSON<unknown>(
      LEGACY_SYNC_CONFIG_KEYS[0],
    );
    const legacyGist = readLocalStorageJSON<unknown>(
      LEGACY_SYNC_CONFIG_KEYS[1],
    );
    const saved = localStorageStore.get(SETTINGS_STORAGE_KEY);
    const raw: unknown = saved ? JSON.parse(saved) : null;
    const parsed =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const currentKey =
      typeof parsed.imgbbApiKey === "string" ? parsed.imgbbApiKey.trim() : "";
    const legacyKey = currentKey
      ? ""
      : (localStorageStore.get("imgbb-api-key")?.trim() ?? "");
    const sidebar = parsed.sidebarConfig as SidebarConfig | undefined;
    const settings: AppSettings = {
      ...defaultSettings,
      ...parsed,
      ...(legacyKey ? { imgbbApiKey: legacyKey } : {}),
      sidebarConfig:
        sidebar && validateMenuConfig(sidebar)
          ? migrateMenuConfig(sidebar)
          : createDefaultSidebarConfig(),
      ...resolveSyncConfigSettings(parsed, legacyWebDAV, legacyGist),
    };
    if (legacyKey || legacyWebDAV || legacyGist) {
      const serialized = JSON.stringify(settings);
      localStorageStore.set(SETTINGS_STORAGE_KEY, serialized);
      // Do not discard legacy credentials if browser storage rejected the migration.
      if (localStorageStore.get(SETTINGS_STORAGE_KEY) === serialized) {
        for (const key of ["imgbb-api-key", ...LEGACY_SYNC_CONFIG_KEYS])
          localStorageStore.remove(key);
      }
    }
    return settings;
  } catch (error) {
    console.error("从本地存储加载设置失败:", error);
    return {
      ...defaultSettings,
      sidebarConfig: createDefaultSidebarConfig(),
      ...createDefaultSyncConfigSettings(),
    };
  }
};

const saveSettings = (settings: Partial<AppSettings>): void =>
  writeLocalStorageJSON(SETTINGS_STORAGE_KEY, {
    ...getSettings(),
    ...settings,
  });

export const getSetting = <K extends AppSettingsKey>(key: K): AppSettings[K] =>
  normalizeSettingValue(key, getSettings()[key]);

export const setSetting = <K extends AppSettingsKey>(
  key: K,
  value: AppSettings[K],
): void =>
  saveSettings({
    [key]: normalizeSettingValue(key, value),
  } as Partial<AppSettings>);

// Character drafts are session-local; all other keys retain their persistent storage semantics.
const storageForKey = (key: string) =>
  key === "characterCardData" ? sessionStorageStore : localStorageStore;

export const saveToLocalStorage = (
  data: unknown,
  key = "characterCardData",
): void => storageForKey(key).writeJSON(key, data);

export const loadFromLocalStorage = (
  key = "characterCardData",
  processFn?: (data: any) => any,
) => {
  const data = storageForKey(key).readJSON<any>(key);
  try {
    return data !== null && processFn ? processFn(data) : data;
  } catch (error) {
    console.error("从本地存储加载失败:", error);
    return null;
  }
};

export const clearLocalStorage = (key = "characterCardData"): void =>
  storageForKey(key).remove(key);

/** Custom interval is in milliseconds; the persisted setting is in seconds. */
export const initAutoSave = (
  saveFn: () => void,
  conditionFn: () => boolean,
  customInterval?: number,
) =>
  window.setInterval(
    () => {
      if (conditionFn()) saveFn();
    },
    customInterval || getSetting("autoSaveInterval") * 1000,
  );

export const clearAutoSave = (timerId: number): void => clearInterval(timerId);
export const getSidebarConfig = (): SidebarConfig =>
  getSettings().sidebarConfig;

export const setSidebarConfig = (config: SidebarConfig): void => {
  const updatedConfig = { ...config, lastUpdated: Date.now() };
  saveSettings({ sidebarConfig: updatedConfig });
  window.dispatchEvent(
    new CustomEvent("sidebarConfigChange", { detail: updatedConfig }),
  );
};

export const getHiddenMenuItems = (): MenuItemConfig[] =>
  getSidebarConfig()
    .items.filter((item) => !item.visible)
    .sort((a, b) => a.order - b.order);

export const updateMenuItemVisibility = (
  itemId: string,
  visible: boolean,
): void => {
  const config = getSidebarConfig();
  const item = config.items.find((item) => item.id === itemId);
  if (!item) return;
  if (item.fixed && !visible) {
    console.warn(`Cannot hide fixed menu item: ${item.title}`);
    return;
  }
  item.visible = visible;
  setSidebarConfig(config);
};

export const updateMenuItemsOrder = (items: MenuItemConfig[]): void => {
  const config = getSidebarConfig();
  const byId = new Map(config.items.map((item) => [item.id, item]));
  items.forEach((item, index) => {
    const existing = byId.get(item.id);
    if (existing) existing.order = index;
  });
  setSidebarConfig(config);
};

export const updateMenuItemTabBar = (
  itemId: string,
  showInTabBar: boolean,
): void => {
  const config = getSidebarConfig();
  const item = config.items.find((item) => item.id === itemId);
  if (!item) return;
  item.showInTabBar = showInTabBar;
  setSidebarConfig(config);
};

export const resetSidebarConfig = (): void =>
  setSidebarConfig(createDefaultSidebarConfig());
