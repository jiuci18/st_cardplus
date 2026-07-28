import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the home page. */
export const homeRoute = {
  path: '/',
  name: 'home',
  component: () => import('./index.vue'),
  meta: { title: '主页' },
} satisfies RouteRecordRaw;
