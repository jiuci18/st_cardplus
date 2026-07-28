import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the preset manager page. */
export const presetRoute = {
  path: '/presetmanager',
  name: 'presetManager',
  component: () => import('./index.vue'),
  meta: { title: '预设管理器' },
} satisfies RouteRecordRaw;
