import {
  Briefcase,
  Collection,
  DataLine,
  EditPen,
  House,
  Location,
  Postcard,
  Tickets,
  Tools,
} from '@element-plus/icons-vue';
import { markRaw } from 'vue';

// 菜单项类型
export type MenuItemType = 'main' | 'tool';

// 菜单项配置接口
export interface MenuItemConfig {
  id: string;
  type: MenuItemType;
  visible: boolean;
  order: number;
  title: string;
  icon: string;
  route: string;
  beta?: boolean;
  description?: string;
  fixed?: boolean;
  showInTabBar?: boolean;
}

// Element Plus 图标映射
const iconMap = {
  House: markRaw(House),
  EditPen: markRaw(EditPen),
  Location: markRaw(Location),
  Postcard: markRaw(Postcard),
  Tools: markRaw(Tools),
  DataLine: markRaw(DataLine),
  Collection: markRaw(Collection),
  Tickets: markRaw(Tickets),
  Briefcase: markRaw(Briefcase),
};

// Iconify 图标映射
const iconifyIconMap: Record<string, string> = {
  House: 'ep:house',
  EditPen: 'ep:edit-pen',
  Location: 'ep:location',
  Postcard: 'ep:postcard',
  Tools: 'ep:tools',
  DataLine: 'ep:data-line',
  Collection: 'ep:collection',
  Tickets: 'ep:tickets',
  Briefcase: 'ep:briefcase',
};

// 主菜单项配置
const mainMenuItems: MenuItemConfig[] = [
  {
    id: 'home',
    type: 'main',
    visible: true,
    order: 0,
    title: '首页',
    icon: 'House',
    route: '/',
    fixed: true,
    showInTabBar: false,
  },
  {
    id: 'cardmanager',
    type: 'main',
    visible: true,
    order: 1,
    title: '角色卡管理器',
    icon: 'Postcard',
    route: '/cardmanager',
    showInTabBar: true, // 默认显示在 TabBar
  },
  {
    id: 'cardinfo',
    type: 'main',
    visible: true,
    order: 2,
    title: '角色信息',
    icon: 'EditPen',
    route: '/cardinfo',
    showInTabBar: false,
  },
  {
    id: 'world',
    type: 'main',
    visible: true,
    order: 3,
    title: '世界地标',
    icon: 'Location',
    route: '/world',
    showInTabBar: true, // 默认显示在 TabBar
  },
  {
    id: 'ejs-editor',
    type: 'main',
    visible: true,
    order: 4,
    title: 'EJS模板',
    icon: 'DataLine',
    route: '/ejs-editor',
    beta: true,
    showInTabBar: false,
  },
  {
    id: 'worldbook',
    type: 'main',
    visible: true,
    order: 5,
    title: '世界书',
    icon: 'Collection',
    route: '/worldbook',
    showInTabBar: false,
  },
  {
    id: 'regex-editor',
    type: 'main',
    visible: true,
    order: 6,
    title: '正则编辑器',
    icon: 'Tickets',
    route: '/regex-editor',
    beta: true,
    showInTabBar: false,
  },
  {
    id: 'presetmanager',
    type: 'main',
    visible: true,
    order: 7,
    title: '预设管理器',
    icon: 'DataLine',
    route: '/presetmanager',
    beta: true,
    showInTabBar: false,
  },
  {
    id: 'toolbox',
    type: 'main',
    visible: true,
    order: 8,
    title: '工具箱',
    icon: 'Briefcase',
    route: '/toolbox',
    fixed: true,
    showInTabBar: true, // 默认显示在 TabBar
  },
];

// 工具箱小工具配置
const toolboxToolItems: MenuItemConfig[] = [
  {
    id: 'json-formatter',
    type: 'tool',
    visible: false,
    order: 100,
    title: 'JSON格式化',
    icon: 'material-symbols:code',
    route: '/toolbox/json-formatter',
    description: '去除JSON中的换行和多余空格',
  },
  {
    id: 'separator',
    type: 'tool',
    visible: false,
    order: 101,
    title: '元数据分离器',
    icon: 'material-symbols:image-outline',
    route: '/toolbox/separator',
    description: '分离角色卡的 json 和图片',
  },
  {
    id: 'worldbook-converter',
    type: 'tool',
    visible: false,
    order: 102,
    title: '世界书转换器',
    icon: 'ph:books-bold',
    route: '/toolbox/worldbook-converter',
    description: '在 CharacterBook 和 WorldBook 格式之间进行双向转换',
  },
  {
    id: 'chinese-converter',
    type: 'tool',
    visible: false,
    order: 104,
    title: '简繁转换器',
    icon: 'material-symbols:translate',
    route: '/toolbox/chinese-converter',
    description: '批量转换角色卡简繁体，支持多种方言',
  },
  {
    id: 'old-world-editor',
    type: 'tool',
    visible: false,
    order: 105,
    title: '旧版世界编辑器',
    icon: 'material-symbols:history',
    route: '/toolbox/old-world-editor',
    description: '兼容旧版本格式的世界地标编辑器',
  },
];

// 获取所有默认菜单项配置
const getAllDefaultMenuItems = (): MenuItemConfig[] => {
  return [...mainMenuItems, ...toolboxToolItems];
};

// 获取图标组件
export const getIconComponent = (iconName: string) => {
  return iconMap[iconName as keyof typeof iconMap] || markRaw(Tools);
};

// 获取 Iconify 图标名称
export const getIconifyIconName = (iconName: string): string => {
  return iconifyIconMap[iconName] || iconName;
};

// 导航栏配置接口
export interface SidebarConfig {
  items: MenuItemConfig[];
  lastUpdated: number;
}

// 创建默认导航栏配置
export const createDefaultSidebarConfig = (): SidebarConfig => ({
  items: getAllDefaultMenuItems(),
  lastUpdated: Date.now(),
});

// 配置验证
export const validateMenuConfig = (config: SidebarConfig): boolean => {
  if (!config || !Array.isArray(config.items)) {
    return false;
  }

  // 检查必要的固定项目是否存在
  const requiredFixedItems = ['home', 'toolbox'];
  const hasRequiredItems = requiredFixedItems.every((id) => config.items.some((item) => item.id === id && item.fixed));

  return hasRequiredItems;
};

// 配置迁移（用于处理旧版本配置）
export const migrateMenuConfig = (oldConfig: any): SidebarConfig => {
  const defaultConfig = createDefaultSidebarConfig();

  if (!oldConfig || !Array.isArray(oldConfig.items)) {
    return defaultConfig;
  }

  // 合并旧配置和新配置
  const mergedItems = defaultConfig.items.map((defaultItem) => {
    const oldItem = oldConfig.items.find((item: any) => item.id === defaultItem.id);
    if (oldItem) {
      return {
        ...defaultItem,
        visible: oldItem.visible ?? defaultItem.visible,
        order: oldItem.order ?? defaultItem.order,
        showInTabBar: oldItem.showInTabBar ?? defaultItem.showInTabBar,
      };
    }
    return defaultItem;
  });

  return {
    items: mergedItems,
    lastUpdated: Date.now(),
  };
};
