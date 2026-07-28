import type { RouteRecordRaw } from 'vue-router';

/** Route definitions owned by the toolbox feature. */
export const toolboxRoutes = [
  {
    path: '/toolbox',
    name: 'toolbox',
    component: () => import('./index.vue'),
    meta: { title: '工具箱' },
  },
  {
    path: '/toolbox/separator',
    name: 'separator',
    component: () => import('@/components/toolsbox/separator.vue'),
    meta: { title: '分隔符工具' },
  },
  {
    path: '/toolbox/worldbook-converter',
    name: 'worldbookConverter',
    component: () => import('@/components/toolsbox/WorldBookConverterTool.vue'),
    meta: { title: '世界书转换器' },
  },
  {
    path: '/toolbox/chinese-converter',
    name: 'chineseConverter',
    component: () => import('@/components/toolsbox/ChineseConverter.vue'),
    meta: { title: '简繁转换器' },
  },
  {
    path: '/toolbox/width-converter',
    name: 'widthConverter',
    component: () => import('@/components/toolsbox/WidthConverter.vue'),
    meta: { title: '文本格式化' },
  },
  {
    path: '/toolbox/old-world-editor',
    name: 'oldWorldEditor',
    component: () => import('@/components/toolsbox/OldWorldEditorTool.vue'),
    meta: { title: '旧版世界编辑器' },
  },
  {
    path: '/toolbox/jsonl-novel-converter',
    name: 'jsonlNovelConverter',
    component: () => import('@/components/toolsbox/JsonlNovelConverter.vue'),
    meta: { title: 'JSONL 小说转换器' },
  },
] satisfies RouteRecordRaw[];
