import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the character card manager page. */
export const cardManagerRoute = {
  path: '/cardmanager',
  name: 'cardManager',
  component: () => import('./index.vue'),
  meta: { title: '角色卡管理' },
} satisfies RouteRecordRaw;
