import type { RouteRecordRaw } from 'vue-router';

/** Catch-all route definition for unmatched locations. */
export const notFoundRoute = {
  path: '/:pathMatch(.*)*',
  name: 'notFound',
  component: () => import('./index.vue'),
  meta: { title: '页面未找到' },
} satisfies RouteRecordRaw;
