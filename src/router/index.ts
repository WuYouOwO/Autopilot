import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Console',
    component: () => import('@/views/ConsoleView.vue'),
    meta: { requiresAuth: true, title: 'Autopilot Console' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: 'Login' },
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

router.beforeEach(async (to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} · Autopilot Console`
  }

  const authStore = useAuthStore()

  // Wait for initial checkAuth if not yet determined (optional, but good if refreshing page)
  if (!authStore.isAuthenticated && localStorage.getItem('easytier_user')) {
    await authStore.checkAuth()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Console' })
  } else {
    next()
  }
})

router.onError((err) => {
  console.error('路由导航异常:', err)
})

export default router
