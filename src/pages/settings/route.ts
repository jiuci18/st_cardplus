import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the settings page. */
export const settingsRoute = {
  path: '/settings',
  name: 'settings',
  component: () => import('./index.vue'),
  meta: { title: '设置' },
} satisfies RouteRecordRaw;
