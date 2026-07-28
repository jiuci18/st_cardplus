import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the EJS editor page. */
export const ejsEditorRoute = {
  path: '/ejs-editor',
  name: 'ejsEditor',
  component: () => import('./index.vue'),
  meta: { title: 'EJS 编辑器' },
} satisfies RouteRecordRaw;
