<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import Button from '@/components/common/Button.vue'
import { Network, Lock, User, Key, RefreshCw, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const isRegister = ref(false)
const username = ref('')
const password = ref('')
const captcha = ref('')
const captchaUrl = ref('')
const errorMessage = ref('')
const loading = ref(false)

const refreshCaptcha = () => {
  captchaUrl.value = api.getCaptchaUrl()
  captcha.value = ''
}

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }
  if (isRegister.value && !captcha.value) {
    errorMessage.value = '请输入验证码'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    if (isRegister.value) {
      await api.register(username.value, password.value, captcha.value)
      isRegister.value = false
      errorMessage.value = ''
      refreshCaptcha()
      // 注册成功自动尝试登录
      await authStore.login(username.value, password.value)
      router.push('/networks')
    } else {
      await authStore.login(username.value, password.value)
      router.push('/networks')
    }
  } catch (err: any) {
    console.error('Auth error:', err)
    errorMessage.value = err.response?.data?.message || (isRegister.value ? '注册失败，请检查验证码' : '登录失败，请检查用户名或密码')
    if (isRegister.value) {
      refreshCaptcha()
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-150">
    <div class="absolute top-6 right-6">
      <ThemeToggle />
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center">
        <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <Network class="w-7 h-7" />
        </div>
      </div>
      <h2 class="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        EasyTier Console
      </h2>
      <p class="mt-1 text-center text-xs text-slate-500 dark:text-zinc-400">
        去中心化网状安全组网管控平台
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white dark:bg-zinc-900 py-8 px-6 sm:px-10 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-none">
        <form class="space-y-4.5" @submit.prevent="handleSubmit">
          <!-- 错误提醒 -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs flex items-center gap-2"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- 用户名 -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              用户名
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User class="w-4 h-4" />
              </div>
              <input
                v-model="username"
                type="text"
                required
                autocomplete="username"
                placeholder="admin"
                class="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <!-- 密码 -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              密码
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock class="w-4 h-4" />
              </div>
              <input
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <!-- 注册验证码 -->
          <div v-if="isRegister">
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              图形验证码
            </label>
            <div class="flex items-center gap-3">
              <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key class="w-4 h-4" />
                </div>
                <input
                  v-model="captcha"
                  type="text"
                  required
                  placeholder="请输入验证码"
                  class="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div
                @click="refreshCaptcha"
                class="h-9 w-28 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 cursor-pointer flex items-center justify-center bg-slate-100 dark:bg-zinc-800"
                title="点击刷新验证码"
              >
                <img v-if="captchaUrl" :src="captchaUrl" alt="验证码" class="h-full w-full object-cover" />
                <RefreshCw v-else class="w-4 h-4 animate-spin text-slate-400" />
              </div>
            </div>
          </div>

          <div class="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              :loading="loading"
              class="w-full justify-center"
            >
              {{ isRegister ? '立即注册账号' : '登录控制台' }}
            </Button>
          </div>
        </form>

        <div class="mt-6 border-t border-slate-100 dark:border-zinc-800 pt-4 flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-zinc-400">
            {{ isRegister ? '已有账号？' : '首次使用没有账号？' }}
          </span>
          <button
            type="button"
            @click="isRegister = !isRegister; errorMessage = ''"
            class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            {{ isRegister ? '返回登录' : '注册新账号' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
