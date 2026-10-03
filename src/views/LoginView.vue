<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#101216] transition-colors selection:bg-orange-500 selection:text-white">
    <!-- CF Login Card -->
    <div class="w-full max-w-sm">
      <!-- Logo & Header -->
      <div class="text-center mb-6">
        <div class="inline-flex w-12 h-12 rounded-lg bg-[#f38020] items-center justify-center text-white shadow-sm mb-3">
          <Cloud class="w-7 h-7 fill-white/20 stroke-white stroke-[2.2]" />
        </div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          {{ isRegister ? '注册 EasyTier 账户' : '登录 EasyTier 控制台' }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          云原生去中心化 Mesh 局域网管控中心
        </p>
      </div>

      <Card class="p-6 border-slate-200 dark:border-[#262a33] shadow-sm">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Username -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              用户名
            </label>
            <div class="relative">
              <User class="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                v-model="form.username"
                type="text"
                required
                autocomplete="username"
                placeholder="例如: admin"
                class="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#191c22] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              密码
            </label>
            <div class="relative">
              <Lock class="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                v-model="form.password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#191c22] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          <!-- Captcha for Registration -->
          <div v-if="isRegister">
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              图形验证码
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.captcha"
                type="text"
                required
                placeholder="输入计算结果"
                class="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#191c22] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              <img
                :src="captchaUrl"
                @click="refreshCaptcha"
                alt="Captcha"
                class="h-8 rounded cursor-pointer border border-slate-200 dark:border-zinc-700 bg-white shrink-0 hover:opacity-85 transition-opacity"
                title="点击刷新验证码"
              />
            </div>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Submit Button in Cloudflare Orange -->
          <Button
            variant="primary"
            type="submit"
            size="md"
            :loading="loading"
            class="w-full justify-center font-bold shadow-xs py-2.5"
          >
            {{ isRegister ? '创建新账户' : '安全登录 (Log in)' }}
          </Button>

          <!-- Toggle Register / Login -->
          <div class="text-center pt-2 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              @click="toggleMode"
              class="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-medium"
            >
              {{ isRegister ? '已有账户？返回登录' : '没有账户？创建新控制台管理员' }}
            </button>
          </div>
        </form>
      </Card>

      <!-- Security Trust Footer -->
      <div class="mt-6 text-center text-[11px] text-slate-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
        <span>端到端 Noise 协议加密与会话鉴权保障</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Cloud,
  User,
  Lock,
  AlertCircle,
  ShieldCheck,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isRegister = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const captchaUrl = ref('')

const form = ref({
  username: '',
  password: '',
  captcha: '',
})

onMounted(() => {
  refreshCaptcha()
})

function refreshCaptcha() {
  captchaUrl.value = api.getCaptchaUrl()
}

function toggleMode() {
  isRegister.value = !isRegister.value
  errorMessage.value = ''
  if (isRegister.value) {
    refreshCaptcha()
  }
}

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    if (isRegister.value) {
      await api.register(form.value.username, form.value.password, form.value.captcha)
      alert('注册成功，正在为您自动登录...')
      await authStore.login(form.value.username, form.value.password)
    } else {
      await authStore.login(form.value.username, form.value.password)
    }

    const redirect = (route.query.redirect as string) || '/networks'
    router.push(redirect)
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || err?.message || '认证失败，请重试'
    if (isRegister.value) {
      refreshCaptcha()
    }
  } finally {
    loading.value = false
  }
}
</script>
