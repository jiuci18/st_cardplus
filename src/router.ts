import { createRouter, createWebHistory } from 'vue-router';

import { appRoutes } from './pages/routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
});

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `st_cardplus · ${to.meta.title}`;
  } else {
    document.title = 'st_cardplus';
  }
});

export default router;
