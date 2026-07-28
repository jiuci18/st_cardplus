import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the world editor page. */
export const worldRoute = {
  path: '/world',
  name: 'world',
  component: () => import('./index.vue'),
  meta: { title: '世界设定' },
} satisfies RouteRecordRaw;
