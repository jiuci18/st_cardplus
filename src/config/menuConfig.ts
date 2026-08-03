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
    showInTabBar: true,
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
    showInTabBar: true,
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
    id: 'ejs-editor',
    type: 'main',
    visible: true,
    order: 5,
    title: 'EJS模板',
    icon: 'DataLine',
    route: '/ejs-editor',
    beta: true,
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
    id: 'width-converter',
    type: 'tool',
    visible: false,
    order: 105,
    title: '文本格式化',
    icon: 'material-symbols:swap-horiz',
    route: '/toolbox/width-converter',
    description: '支持全角半角转换、清除独立空行与 JSON 压缩',
  },
  {
    id: 'old-world-editor',
    type: 'tool',
    visible: false,
    order: 106,
    title: '旧版世界编辑器',
    icon: 'material-symbols:history',
    route: '/toolbox/old-world-editor',
    description: '兼容旧版本格式的世界地标编辑器',
  },

  {
    id: 'jsonl-novel-converter',
    type: 'tool',
    visible: false,
    order: 107,
    title: 'JSONL 小说转换器',
    icon: 'material-symbols:article-outline',
    route: '/toolbox/jsonl-novel-converter',
    description: '将 JSONL 聊天记录整理为可阅读的 Markdown 小说',
  },
  {
    id: 'image-generator',
    type: 'tool',
    visible: false,
    order: 108,
    title: '图片生成',
    icon: 'material-symbols:add-photo-alternate-outline',
    route: '/toolbox/image-generator',
    description: '通过 OpenAI 兼容 ChatAPI 生成图片，支持参考图与批量请求',
  },
  {
    id: 'key-value-tree-filler',
    type: 'tool',
    visible: false,
    order: 109,
    title: '树状键值填写器',
    icon: 'material-symbols:account-tree-outline',
    route: '/toolbox/key-value-filler',
    beta: true,
    description: '用节点树填写嵌套键值，并导出为 JSON 或 YAML',
  },
];

// 获取所有默认菜单项配置
const getAllDefaultMenuItems = (): MenuItemConfig[] => {
  return [...mainMenuItems, ...toolboxToolItems];
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
