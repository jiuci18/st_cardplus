import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the about page. */
export const aboutRoute = {
  path: '/about',
  name: 'about',
  component: () => import('./index.vue'),
  meta: { title: '关于' },
} satisfies RouteRecordRaw;
