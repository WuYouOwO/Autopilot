import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const username = ref(localStorage.getItem('easytier_user') || '')
  const loading = ref(false)

  const checkAuth = async (): Promise<boolean> => {
    loading.value = true
    try {
      const ok = await api.checkLoginStatus()
      isAuthenticated.value = ok
      return ok
    } catch {
      isAuthenticated.value = false
      return false
    } finally {
      loading.value = false
    }
  }

  const login = async (user: string, pass: string): Promise<boolean> => {
    loading.value = true
    try {
      await api.login(user, pass)
      isAuthenticated.value = true
      username.value = user
      localStorage.setItem('easytier_user', user)
      return true
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } finally {
      isAuthenticated.value = false
      username.value = ''
      localStorage.removeItem('easytier_user')
    }
  }

  return {
    isAuthenticated,
    username,
    loading,
    checkAuth,
    login,
    logout,
  }
})
