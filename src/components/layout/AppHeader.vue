<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Cloud,
  Layers,
  ChevronDown,
  LogOut,
  User,
  Radio,
} from 'lucide-vue-next'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import { useAuthStore } from '@/stores/auth'
import { useNetworkStore } from '@/stores/network'

const router = useRouter()
const authStore = useAuthStore()
const networkStore = useNetworkStore()

const currentNetworkName = computed({
  get: () => networkStore.activeNetworkName,
  set: (val: string) => {
    networkStore.activeNetworkName = val
  },
})

const availableNetworks = computed(() => {
  const keys = Object.keys(networkStore.meshNetworks)
  return keys.length > 0 ? keys : ['default']
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="h-14 border-b border-slate-200 dark:border-[#262a33] bg-white dark:bg-[#101216] sticky top-0 z-40 transition-colors">
    <div class="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
      <!-- Left: CF Brand & Breadcrumb -->
      <div class="flex items-center gap-3 min-w-0">
        <!-- Logo -->
        <router-link to="/networks" class="flex items-center gap-2.5 shrink-0 group">
          <div class="w-7 h-7 rounded bg-[#f38020] flex items-center justify-center text-white shadow-xs group-hover:bg-[#e55b00] transition-colors">
            <Cloud class="w-4 h-4 fill-white/20 stroke-white stroke-[2.2]" />
          </div>
          <div class="hidden sm:flex flex-col">
            <span class="font-bold text-sm tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 leading-none">
              EasyTier
              <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-orange-100 dark:bg-orange-950/60 text-[#d96200] dark:text-orange-400 border border-orange-200/80 dark:border-orange-900/50">
                ZERO TRUST
              </span>
            </span>
          </div>
        </router-link>

        <span class="text-slate-300 dark:text-zinc-700 hidden sm:inline text-sm">/</span>

        <!-- Network Selector Dropdown -->
        <div class="flex items-center gap-1.5 min-w-0">
          <Layers class="w-3.5 h-3.5 text-slate-400 shrink-0 hidden md:inline" />
          <div class="relative">
            <select
              v-model="currentNetworkName"
              class="appearance-none bg-slate-50 dark:bg-[#191c22] border border-slate-200 dark:border-[#262a33] hover:border-orange-400 dark:hover:border-orange-500 rounded py-1 pl-2.5 pr-7 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors max-w-[150px] sm:max-w-[200px] truncate"
            >
              <option v-for="net in availableNetworks" :key="net" :value="net">
                {{ net }}
              </option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- Right: Global status & User Controls -->
      <div class="flex items-center gap-2.5 shrink-0">
        <!-- Live Edge Controller Indicator -->
        <div class="hidden md:flex items-center">
          <Badge variant="success" size="sm" dot pulse>
            边缘网络联通中
          </Badge>
        </div>

        <div class="h-4 w-px bg-slate-200 dark:border-zinc-800 hidden md:block"></div>

        <!-- Theme Toggle -->
        <ThemeToggle />

        <!-- User Profile & Logout -->
        <div class="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-zinc-800">
          <div class="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60">
            <User class="w-3.5 h-3.5 text-orange-500" />
            <span class="font-medium hidden sm:inline">{{ authStore.username || 'admin' }}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            @click="handleLogout"
            class="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
            title="退出登录"
          >
            <LogOut class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </header>
</template>
