import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./pages/HomePage.vue'),
      meta: { title: '主页' },
    },
    {
      path: '/cardinfo',
      name: 'card',
      component: () => import('./pages/CardPage.vue'),
      meta: { title: '角色信息' },
    },
    {
      path: '/world',
      name: 'world',
      component: () => import('./pages/WorldPage.vue'),
      meta: { title: '世界设定' },
    },
    {
      path: '/cardmanager',
      name: 'cardManager',
      component: () => import('./pages/CardManager.vue'),
      meta: { title: '角色卡管理' },
    },
    {
      path: '/worldbook',
      name: 'worldbook',
      component: () => import('./pages/WorldBook.vue'),
      meta: { title: '世界书' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./pages/About.vue'),
      meta: { title: '关于' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('./pages/SettingsPage.vue'),
      meta: { title: '设置' },
    },
    {
      path: '/presetmanager',
      name: 'presetManager',
      component: () => import('./pages/Preset.vue'),
      meta: { title: '预设管理器' },
    },
    {
      path: '/toolbox',
      name: 'toolbox',
      component: () => import('./pages/ToolboxPage.vue'),
      meta: { title: '工具箱' },
    },
    {
      path: '/toolbox/separator',
      name: 'separator',
      component: () => import('./components/toolsbox/separator.vue'),
      meta: { title: '分隔符工具' },
    },
    {
      path: '/toolbox/worldbook-converter',
      name: 'worldbookConverter',
      component: () => import('./components/toolsbox/WorldBookConverterTool.vue'),
      meta: { title: '世界书转换器' },
    },
    {
      path: '/toolbox/chinese-converter',
      name: 'chineseConverter',
      component: () => import('./components/toolsbox/ChineseConverter.vue'),
      meta: { title: '简繁转换器' },
    },
    {
      path: '/toolbox/width-converter',
      name: 'widthConverter',
      component: () => import('./components/toolsbox/WidthConverter.vue'),
      meta: { title: '文本格式化' },
    },
    {
      path: '/toolbox/old-world-editor',
      name: 'oldWorldEditor',
      component: () => import('./components/toolsbox/OldWorldEditorTool.vue'),
      meta: { title: '旧版世界编辑器' },
    },
    {
      path: '/regex-editor',
      name: 'regexEditor',
      component: () => import('./pages/RegexEditorPage.vue'),
      meta: { title: '正则表达式编辑器' },
    },
    {
      path: '/ejs-editor',
      name: 'ejsEditor',
      component: () => import('./pages/EjsEditorPage.vue'),
      meta: { title: 'EJS 编辑器' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('./pages/NotFound.vue'),
      meta: { title: '页面未找到' },
    },
  ],
});

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `酒馆角色卡工具箱 · ${to.meta.title}`;
  } else {
    document.title = '酒馆角色卡工具箱';
  }
});
export default router;
