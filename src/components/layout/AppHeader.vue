<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Cloud,
  Layers,
  ChevronDown,
  LogOut,
  User,
  Search,
  Sparkles,
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
  <header class="h-14 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-sm sticky top-0 z-40 transition-colors">
    <div class="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
      <!-- Left: Brand & Breadcrumbs -->
      <div class="flex items-center gap-3.5 min-w-0">
        <!-- Logo -->
        <router-link to="/networks" class="flex items-center gap-2.5 shrink-0 group">
          <div class="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-xs group-hover:opacity-90 transition-opacity">
            <Cloud class="w-4 h-4 fill-white/20 stroke-white stroke-[2.2]" />
          </div>
          <div class="hidden sm:flex flex-col">
            <span class="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
              EasyTier
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                ZERO TRUST
              </span>
            </span>
          </div>
        </router-link>

        <span class="text-slate-300 dark:text-slate-700 hidden sm:inline text-sm">/</span>

        <!-- Network Selector Dropdown -->
        <div class="flex items-center gap-1.5 min-w-0">
          <Layers class="w-3.5 h-3.5 text-slate-400 shrink-0 hidden md:inline" />
          <div class="relative">
            <select
              v-model="currentNetworkName"
              class="appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-md py-1 pl-2.5 pr-7 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors max-w-[150px] sm:max-w-[200px] truncate"
            >
              <option v-for="net in availableNetworks" :key="net" :value="net">
                {{ net }}
              </option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>

        <!-- Quick Search Bar (CF style) -->
        <div class="hidden lg:flex items-center gap-2 px-2.5 py-1 text-xs rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 min-w-[210px]">
          <Search class="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span class="truncate">快速搜索网络与边缘...</span>
          <kbd class="ml-auto px-1.5 py-0.2 text-[10px] font-mono bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-400 shadow-2xs">Ctrl K</kbd>
        </div>
      </div>

      <!-- Right: Global status & User Controls -->
      <div class="flex items-center gap-3 shrink-0">
        <!-- Live Edge Controller Indicator -->
        <div class="hidden md:flex items-center">
          <Badge variant="success" size="sm" dot pulse>
            全网 Mesh 互联
          </Badge>
        </div>

        <div class="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

        <!-- Theme Toggle -->
        <ThemeToggle />

        <!-- User Profile & Logout -->
        <div class="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <User class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span class="font-medium hidden sm:inline">{{ authStore.username || 'admin' }}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            @click="handleLogout"
            class="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
            title="退出登录"
          >
            <LogOut class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </header>
</template>
