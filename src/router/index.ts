import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Console',
    component: () => import('@/views/ConsoleView.vue'),
    meta: { public: true, title: 'EasyTier Console' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} · EasyTier Autopilot`
  }
})

router.onError((err) => {
  console.error('路由导航异常:', err)
})

export default router
