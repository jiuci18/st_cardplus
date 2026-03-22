import {
  type MenuItemConfig,
  type MenuItemType,
  type SidebarConfig,
  createDefaultSidebarConfig,
  migrateMenuConfig,
  validateMenuConfig,
} from '@/config/menuConfig';

const SETTINGS_KEY = 'settings';

// 重新导出类型供其他模块使用
export type { MenuItemConfig, MenuItemType, SidebarConfig };

interface AppSettings {
  betaFeaturesEnabled: boolean;
  umamiEnabled: boolean;
  autoSaveInterval: number;
  autoSaveDebounce: number;
  imgbbApiKey: string;
  updateIgnoreUntil: string;
  autoExpandSidebar: boolean;
  sidebarConfig: SidebarConfig;
}

type LocalStorageSnapshot = Record<string, string | null>;
export type AppSettingsKey = keyof AppSettings;

const getLocalStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('读取本地存储失败:', error);
    return null;
  }
};

const setLocalStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('写入本地存储失败:', error);
  }
};

const removeLocalStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('移除本地存储失败:', error);
  }
};

const clearAllLocalStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('清空本地存储失败:', error);
  }
};

const getLocalStorageKeys = (): string[] => {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
  } catch (error) {
    console.error('读取本地存储键失败:', error);
  }
  return keys;
};

export const getLocalStorageSnapshot = (options?: { excludeKeys?: string[] }): LocalStorageSnapshot => {
  const snapshot: LocalStorageSnapshot = {};
  const excludeSet = new Set(options?.excludeKeys ?? []);
  getLocalStorageKeys().forEach((key) => {
    if (!excludeSet.has(key)) {
      snapshot[key] = getLocalStorageItem(key);
    }
  });
  return snapshot;
};

export const restoreLocalStorageSnapshot = (
  snapshot: LocalStorageSnapshot,
  options?: { preserveKeys?: string[] }
): void => {
  const preserved: LocalStorageSnapshot = {};
  (options?.preserveKeys ?? []).forEach((key) => {
    const value = getLocalStorageItem(key);
    if (value !== null) preserved[key] = value;
  });

  clearAllLocalStorage();

  Object.entries(snapshot).forEach(([key, value]) => {
    if (value !== null) setLocalStorageItem(key, value);
  });

  Object.entries(preserved).forEach(([key, value]) => {
    if (value !== null) setLocalStorageItem(key, value);
  });
};

export const getSessionStorageItem = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('读取会话存储失败:', error);
    return null;
  }
};

export const setSessionStorageItem = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.error('写入会话存储失败:', error);
  }
};

export const removeSessionStorageItem = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('移除会话存储失败:', error);
  }
};

export const readLocalStorageJSON = <T>(key: string): T | null => {
  const value = getLocalStorageItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`解析本地存储 JSON 失败: ${key}`, error);
    return null;
  }
};

export const writeLocalStorageJSON = (key: string, value: unknown): void => {
  try {
    setLocalStorageItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`写入本地存储 JSON 失败: ${key}`, error);
  }
};

export const readSessionStorageJSON = <T>(key: string): T | null => {
  const value = getSessionStorageItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`解析会话存储 JSON 失败: ${key}`, error);
    return null;
  }
};

export const writeSessionStorageJSON = (key: string, value: unknown): void => {
  try {
    setSessionStorageItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`写入会话存储 JSON 失败: ${key}`, error);
  }
};

// 使用统一配置文件中的默认配置
const defaultSettings: AppSettings = {
  betaFeaturesEnabled: false,
  umamiEnabled: true,
  autoSaveInterval: 5,
  autoSaveDebounce: 1.5,
  imgbbApiKey: '',
  updateIgnoreUntil: '',
  autoExpandSidebar: true,
  sidebarConfig: createDefaultSidebarConfig(),
};

const normalizeSettingValue = <K extends AppSettingsKey>(key: K, value: AppSettings[K]): AppSettings[K] => {
  if (key === 'autoSaveInterval') {
    const interval = Number(value);
    const fallback = defaultSettings.autoSaveInterval;
    const safeInterval = Number.isFinite(interval) ? interval : fallback;
    return Math.max(1, Math.min(60, safeInterval)) as AppSettings[K];
  }
  if (key === 'autoSaveDebounce') {
    const debounce = Number(value);
    const fallback = defaultSettings.autoSaveDebounce;
    const safeDebounce = Number.isFinite(debounce) ? debounce : fallback;
    return Math.max(0.1, Math.min(10, safeDebounce)) as AppSettings[K];
  }
  if (key === 'imgbbApiKey') {
    return String(value ?? '').trim() as AppSettings[K];
  }
  if (key === 'updateIgnoreUntil') {
    return String(value ?? '').trim() as AppSettings[K];
  }
  return value;
};

/**
 * 从本地存储加载设置
 * @returns AppSettings object
 */
const getSettings = (): AppSettings => {
  try {
    const savedSettings = getLocalStorageItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      const currentImgbbApiKey = typeof parsed.imgbbApiKey === 'string' ? parsed.imgbbApiKey.trim() : '';
      const legacyImgbbApiKey = currentImgbbApiKey ? '' : (getLocalStorageItem('imgbb-api-key')?.trim() ?? '');

      let sidebarConfig = parsed.sidebarConfig;
      if (!sidebarConfig || !validateMenuConfig(sidebarConfig)) {
        console.log('导航栏配置无效或不存在，使用默认配置');
        sidebarConfig = createDefaultSidebarConfig();
      } else {
        sidebarConfig = migrateMenuConfig(sidebarConfig);
      }
      const mergedSettings = {
        ...defaultSettings,
        ...parsed,
        ...(legacyImgbbApiKey ? { imgbbApiKey: legacyImgbbApiKey } : {}),
        sidebarConfig,
      };

      if (legacyImgbbApiKey) {
        setLocalStorageItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
        removeLocalStorageItem('imgbb-api-key');
      }

      return mergedSettings;
    }

    const legacyImgbbApiKey = getLocalStorageItem('imgbb-api-key')?.trim() ?? '';
    if (legacyImgbbApiKey) {
      const migratedSettings = {
        ...defaultSettings,
        imgbbApiKey: legacyImgbbApiKey,
      };
      setLocalStorageItem(SETTINGS_KEY, JSON.stringify(migratedSettings));
      removeLocalStorageItem('imgbb-api-key');
      return migratedSettings;
    }
  } catch (error) {
    console.error('从本地存储加载设置失败:', error);
  }
  return { ...defaultSettings };
};

/**
 * 保存部分或全部设置到本地存储
 * @param settings - a partial AppSettings object
 */
const saveSettings = (settings: Partial<AppSettings>) => {
  try {
    const currentSettings = getSettings();
    const newSettings = { ...currentSettings, ...settings };
    setLocalStorageItem(SETTINGS_KEY, JSON.stringify(newSettings));
  } catch (error) {
    console.error('保存设置到本地存储失败:', error);
  }
};

/**
 * 读取单个设置项
 * @param key - AppSettings key
 */
export const getSetting = <K extends AppSettingsKey>(key: K): AppSettings[K] => {
  const settings = getSettings();
  return normalizeSettingValue(key, settings[key]);
};

/**
 * 更新单个设置项
 * @param key - AppSettings key
 * @param value - setting value
 */
export const setSetting = <K extends AppSettingsKey>(key: K, value: AppSettings[K]) => {
  const normalized = normalizeSettingValue(key, value);
  saveSettings({ [key]: normalized } as Partial<AppSettings>);
};

const SESSION_STORAGE_KEYS = new Set(['characterCardData']);

const shouldUseSessionStorage = (key: string) => SESSION_STORAGE_KEYS.has(key);

/**
 * 保存数据到本地存储
 * @param data - 要保存的数据
 * @param key - 存储键名，默认为'characterCardData'（该键使用会话存储）
 */
export const saveToLocalStorage = (data: any, key = 'characterCardData') => {
  try {
    if (shouldUseSessionStorage(key)) {
      writeSessionStorageJSON(key, data);
      return;
    }
    writeLocalStorageJSON(key, data);
  } catch (error) {
    console.error('保存到本地存储失败:', error);
  }
};

/**
 * 从本地存储加载数据
 * @param key - 存储键名，默认为'characterCardData'（该键使用会话存储）
 * @param processFn - 数据处理函数
 * @returns 加载并处理后的数据
 */
export const loadFromLocalStorage = (key = 'characterCardData', processFn?: (data: any) => any) => {
  try {
    if (shouldUseSessionStorage(key)) {
      const sessionData = readSessionStorageJSON<any>(key);
      if (sessionData !== null) return processFn ? processFn(sessionData) : sessionData;
      return null;
    }

    const parsedData = readLocalStorageJSON<any>(key);
    if (parsedData !== null) return processFn ? processFn(parsedData) : parsedData;
  } catch (error) {
    console.error('从本地存储加载失败:', error);
  }
  return null;
};

/**
 * 清除本地存储的数据
 * @param key - 存储键名，默认为'characterCardData'（该键使用会话存储）
 */
export const clearLocalStorage = (key = 'characterCardData') => {
  if (shouldUseSessionStorage(key)) {
    removeSessionStorageItem(key);
    return;
  }
  removeLocalStorageItem(key);
};

/**
 * 初始化自动保存
 * @param saveFn - 保存函数
 * @param conditionFn - 保存条件函数
 * @param customInterval - 自定义保存间隔（毫秒），如果不提供则使用用户设置的间隔
 * @returns 定时器ID
 */
export const initAutoSave = (saveFn: () => void, conditionFn: () => boolean, customInterval?: number) => {
  const intervalMs = customInterval || getSetting('autoSaveInterval') * 1000;
  return window.setInterval(() => {
    if (conditionFn()) {
      saveFn();
    }
  }, intervalMs);
};

/**
 * 清除自动保存定时器
 * @param timerId - 定时器ID
 */
export const clearAutoSave = (timerId: number) => {
  clearInterval(timerId);
};

/**
 * 获取导航栏配置
 * @returns 导航栏配置
 */
export const getSidebarConfig = (): SidebarConfig => {
  return getSettings().sidebarConfig;
};

/**
 * 保存导航栏配置
 * @param config - 导航栏配置
 */
export const setSidebarConfig = (config: SidebarConfig) => {
  const updatedConfig = {
    ...config,
    lastUpdated: Date.now(),
  };
  saveSettings({ sidebarConfig: updatedConfig });
  console.log('导航栏配置已保存');

  // 发送自定义事件通知配置已更新
  const event = new CustomEvent('sidebarConfigChange', { detail: updatedConfig });
  window.dispatchEvent(event);
};

/**
 * 获取隐藏的菜单项（用于工具箱显示）
 * @returns 隐藏的菜单项数组
 */
export const getHiddenMenuItems = (): MenuItemConfig[] => {
  const config = getSidebarConfig();
  return config.items.filter((item) => !item.visible).sort((a, b) => a.order - b.order);
};

/**
 * 更新菜单项的可见性
 * @param itemId - 菜单项ID
 * @param visible - 是否可见
 */
export const updateMenuItemVisibility = (itemId: string, visible: boolean) => {
  const config = getSidebarConfig();
  const itemIndex = config.items.findIndex((item) => item.id === itemId);

  if (itemIndex !== -1) {
    const item = config.items[itemIndex];
    // 检查是否为固定项目，固定项目不能隐藏
    if (item.fixed && !visible) {
      console.warn(`Cannot hide fixed menu item: ${item.title}`);
      return;
    }
    config.items[itemIndex].visible = visible;
    setSidebarConfig(config);
  }
};

/**
 * 更新菜单项顺序
 * @param items - 重新排序后的菜单项数组
 */
export const updateMenuItemsOrder = (items: MenuItemConfig[]) => {
  const config = getSidebarConfig();

  // 更新顺序
  items.forEach((item, index) => {
    const existingItemIndex = config.items.findIndex((configItem) => configItem.id === item.id);
    if (existingItemIndex !== -1) {
      config.items[existingItemIndex].order = index;
    }
  });

  setSidebarConfig(config);
};

/**
 * 更新菜单项的 TabBar 显示状态
 * @param itemId - 菜单项ID
 * @param showInTabBar - 是否在移动端 TabBar 中显示
 */
export const updateMenuItemTabBar = (itemId: string, showInTabBar: boolean) => {
  const config = getSidebarConfig();
  const itemIndex = config.items.findIndex((item) => item.id === itemId);

  if (itemIndex !== -1) {
    config.items[itemIndex].showInTabBar = showInTabBar;
    setSidebarConfig(config);
  }
};

/**
 * 重置导航栏配置为默认值
 */
export const resetSidebarConfig = () => {
  const defaultConfig = createDefaultSidebarConfig();
  setSidebarConfig(defaultConfig);
  console.log('导航栏配置已重置为默认值');
};
