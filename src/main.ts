import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { api } from './lib/api'
import { useAuthStore } from './stores/auth'

// Global styles
import '@/assets/styles/main.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

api.setUnauthorizedCallback(() => {
  const authStore = useAuthStore(pinia)
  authStore.isAuthenticated = false
  authStore.username = ''
  localStorage.removeItem('easytier_user')
  
  if (router.currentRoute.value.name !== 'Login') {
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})

app.mount('#app')
