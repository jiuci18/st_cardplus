import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the character info page. */
export const cardRoute = {
  path: '/cardinfo',
  name: 'card',
  component: () => import('./index.vue'),
  meta: { title: '角色信息' },
} satisfies RouteRecordRaw;
