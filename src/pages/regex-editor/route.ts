import type { RouteRecordRaw } from 'vue-router';

/** Route definition for the regular expression editor page. */
export const regexEditorRoute = {
  path: '/regex-editor',
  name: 'regexEditor',
  component: () => import('./index.vue'),
  meta: { title: '正则表达式编辑器' },
} satisfies RouteRecordRaw;
