import { ref, watch } from 'vue';
import {
  getSessionStorageItem,
  setSessionStorageItem,
  readSessionStorageJSON,
  writeSessionStorageJSON,
} from '@/utils/localStorageUtils';

/**
 * 标签页类型
 */
export type TabType = 'home' | 'character-card';

/**
 * 标签页数据结构
 */
export interface Tab {
  id: string; // 唯一标识，home 或角色卡 ID
  type: TabType;
  label: string; // 显示标题
  closable: boolean; // 是否可关闭
  cardId?: string; // 角色卡 ID（仅 type='character-card' 时）
}

/**
 * 标签页管理器
 */
export function useTabManager() {
  // 打开的标签页列表
  const tabs = ref<Tab[]>([
    {
      id: 'home',
      type: 'home',
      label: '角色卡库',
      closable: false,
    },
  ]);

  // 当前激活的标签页 ID
  const activeTabId = ref<string>('home');
  const restoreTabsFromStorage = () => {
    try {
      const storedTabs = readSessionStorageJSON<Tab[]>('characterCardTabs');
      const storedActiveTab = getSessionStorageItem('characterCardActiveTab');

      if (storedTabs) {
        if (!storedTabs.find((t) => t.id === 'home')) {
          storedTabs.unshift({
            id: 'home',
            type: 'home',
            label: '角色卡库',
            closable: false,
          });
        }
        tabs.value = storedTabs;
      }

      if (storedActiveTab) {
        // 验证存储的激活标签是否存在
        if (tabs.value.find((t) => t.id === storedActiveTab)) {
          activeTabId.value = storedActiveTab;
        }
      }
    } catch (error) {
      console.error('恢复标签页状态失败:', error);
    }
  };

  // 保存标签页状态到 sessionStorage
  const saveTabsToStorage = () => {
    try {
      writeSessionStorageJSON('characterCardTabs', tabs.value);
      setSessionStorageItem('characterCardActiveTab', activeTabId.value);
    } catch (error) {
      console.error('保存标签页状态失败:', error);
    }
  };

  // 监听标签页变化，自动保存
  watch(
    [tabs, activeTabId],
    () => {
      saveTabsToStorage();
    },
    { deep: true }
  );

  /**
   * 打开角色卡标签页
   * @param cardId 角色卡 ID
   * @param cardName 角色卡名称
   */
  const openCharacterCardTab = (cardId: string, cardName: string) => {
    // 检查是否已经打开
    const existingTab = tabs.value.find((t) => t.id === cardId);
    if (existingTab) {
      // 已存在，直接切换
      activeTabId.value = cardId;
      return;
    }

    // 创建新标签页
    const newTab: Tab = {
      id: cardId,
      type: 'character-card',
      label: cardName,
      closable: true,
      cardId,
    };

    tabs.value.push(newTab);
    activeTabId.value = cardId;
  };

  /**
   * 关闭标签页
   * @param tabId 标签页 ID
   */
  const closeTab = (tabId: string) => {
    const index = tabs.value.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    const tab = tabs.value[index];
    // 主页标签不可关闭
    if (!tab.closable) return;
    if (activeTabId.value === tabId) {
      if (index < tabs.value.length - 1) {
        activeTabId.value = tabs.value[index + 1].id;
      } else if (index > 0) {
        activeTabId.value = tabs.value[index - 1].id;
      } else {
        activeTabId.value = 'home';
      }
    }

    // 移除标签页
    tabs.value.splice(index, 1);
  };

  /**
   * 切换到指定标签页
   * @param tabId 标签页 ID
   */
  const switchToTab = (tabId: string) => {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (tab) {
      activeTabId.value = tabId;
    }
  };

  /**
   * 更新标签页标题（当角色卡重命名时）
   * @param tabId 标签页 ID
   * @param newLabel 新标题
   */
  const updateTabLabel = (tabId: string, newLabel: string) => {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (tab) {
      tab.label = newLabel;
    }
  };

  /**
   * 关闭角色卡标签页（当角色卡被删除时）
   * @param cardId 角色卡 ID
   */
  const closeCharacterCardTab = (cardId: string) => {
    closeTab(cardId);
  };

  /**
   * 关闭所有角色卡标签页（保留主页）
   */
  const closeAllCharacterCardTabs = () => {
    tabs.value = tabs.value.filter((t) => t.type === 'home');
    activeTabId.value = 'home';
  };

  /**
   * 重新排序标签页
   * @param newTabs 新的标签页顺序
   */
  const reorderTabs = (newTabs: Tab[]) => {
    tabs.value = newTabs;
  };

  /**
   * 获取当前激活的标签页
   */
  const getActiveTab = () => {
    return tabs.value.find((t) => t.id === activeTabId.value);
  };

  // 初始化时恢复状态
  restoreTabsFromStorage();

  return {
    tabs,
    activeTabId,
    openCharacterCardTab,
    closeTab,
    switchToTab,
    updateTabLabel,
    closeCharacterCardTab,
    closeAllCharacterCardTabs,
    reorderTabs,
    getActiveTab,
  };
}
