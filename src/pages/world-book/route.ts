import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the world book page. */
export const worldBookRoute = {
  path: '/worldbook',
  name: 'worldbook',
  component: () => import('./index.vue'),
  meta: { title: '世界书' },
} satisfies RouteRecordRaw;
