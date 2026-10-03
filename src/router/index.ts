import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/layout/AppLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/networks',
    children: [
      {
        path: 'networks',
        name: 'Networks',
        component: () => import('@/views/NetworksView.vue'),
        meta: { title: '虚拟网络' },
      },
      {
        path: 'policies',
        name: 'Policies',
        component: () => import('@/views/PoliciesView.vue'),
        meta: { title: '零信任策略' },
      },
      {
        path: 'credentials',
        name: 'Credentials',
        component: () => import('@/views/CredentialsView.vue'),
        meta: { title: '访问凭证' },
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('@/views/DevicesView.vue'),
        meta: { title: '物理设备' },
      },
      {
        path: 'diagnostics',
        name: 'Diagnostics',
        component: () => import('@/views/DiagnosticsView.vue'),
        meta: { title: '链路诊断' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/networks',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 检查登录状态
  if (authStore.isAuthenticated === false) {
    await authStore.checkAuth()
  }

  const isPublic = to.matched.some((record) => record.meta.public)

  if (!authStore.isAuthenticated && !isPublic) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (authStore.isAuthenticated && to.path === '/login') {
    return next({ path: '/networks' })
  }

  next()
})

export default router
