import type { Component, InjectionKey, Ref } from 'vue';
import { computed, inject, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { MenuItemConfig } from '@/config/menuConfig';
import { getIconComponent } from '@/config/menuConfig';

import { useDark, useToggle } from '@vueuse/core';
import { useDevice } from './useDevice';

export interface ProcessedMenuItem extends Omit<MenuItemConfig, 'icon'> {
  index: string;
  icon: Component;
  originalIcon: string;
}

export interface NavigationContext {
  isMobile: Ref<boolean>;
  isDark: Ref<boolean>;

  mainNavItems: Ref<ProcessedMenuItem[]>;
  toolboxItem: Ref<ProcessedMenuItem | null>;
  tabBarItems: Ref<ProcessedMenuItem[]>;
  allMenuItems: Ref<ProcessedMenuItem[]>;

  toggleDark: () => void;
  isActive: (path: string) => boolean;
  navigateTo: (path: string) => void;
}

const NavigationKey: InjectionKey<NavigationContext> = Symbol('navigation');

/**
 * 提供导航上下文
 * @param menuItems 原始菜单配置项
 */
export function provideNavigation(menuItems: Ref<MenuItemConfig[]>): NavigationContext {
  const router = useRouter();
  const route = useRoute();

  const { isMobileOrTablet } = useDevice();
  const isMobile = isMobileOrTablet;

  const isDark = useDark();
  const toggleDarkFn = useToggle(isDark);

  const toggleDark = () => {
    // 使用 View Transitions API 或 fallback
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        toggleDarkFn();
      });
    } else {
      // 手动添加过渡类
      document.documentElement.classList.add('theme-transitioning');
      toggleDarkFn();
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);
    }
  };

  const processMenuItem = (item: MenuItemConfig): ProcessedMenuItem => ({
    ...item,
    index: item.route,
    originalIcon: item.icon,
    icon: getIconComponent(item.icon),
  });

  const allMenuItems = computed(() => menuItems.value.map(processMenuItem));
  const mainNavItems = computed(() => allMenuItems.value.filter((item) => item.visible && item.id !== 'toolbox'));
  const toolboxItem = computed(() => {
    const item = allMenuItems.value.find((item) => item.id === 'toolbox' && item.visible);
    return item || null;
  });

  // TabBar 显示的项目
  const tabBarItems = computed(() =>
    allMenuItems.value.filter((item) => item.visible && item.showInTabBar === true).sort((a, b) => a.order - b.order)
  );

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return route.path === '/';
    }

    return route.path === path || route.path.startsWith(path + '/');
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const context: NavigationContext = {
    isMobile,
    isDark,
    mainNavItems,
    toolboxItem,
    tabBarItems,
    allMenuItems,
    toggleDark,
    isActive,
    navigateTo,
  };

  provide(NavigationKey, context);

  return context;
}

export function useNavigation(): NavigationContext {
  const context = inject(NavigationKey);
  if (!context) {
    throw new Error('useNavigation must be used within a component that has called provideNavigation');
  }
  return context;
}
