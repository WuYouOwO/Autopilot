<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNetworkStore } from '@/stores/network'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import {
  Network,
  LogOut,
  ChevronDown,
  Activity,
  Layers,
  Search,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const networkStore = useNetworkStore()

const currentNetworkName = computed(() => networkStore.activeNetworkName)
const allNetworkNames = computed(() => Object.keys(networkStore.meshNetworks))

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="h-14 border-b border-slate-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors">
    <!-- 左侧 Logo & 网络切换 -->
    <div class="flex items-center gap-4 sm:gap-6">
      <router-link to="/networks" class="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white select-none">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
          <Network class="w-4.5 h-4.5" />
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-semibold tracking-tight">EasyTier</span>
          <span class="text-[10px] text-slate-400 dark:text-zinc-500 font-mono -mt-1 font-normal">Console</span>
        </div>
      </router-link>

      <div class="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block"></div>

      <!-- 虚拟网络切换器 -->
      <div class="relative group">
        <button
          type="button"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 dark:text-zinc-200 transition-colors"
        >
          <Layers class="w-3.5 h-3.5 text-indigo-500" />
          <span>网络: <span class="font-bold text-slate-900 dark:text-white">{{ currentNetworkName }}</span></span>
          <ChevronDown class="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform duration-150" />
        </button>

        <!-- 下拉菜单 -->
        <div class="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg p-1.5 hidden group-hover:block z-50">
          <div class="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 px-2 py-1">切换 Mesh 网络</div>
          <button
            v-for="name in (allNetworkNames.length ? allNetworkNames : ['default'])"
            :key="name"
            type="button"
            @click="networkStore.activeNetworkName = name"
            :class="[
              'w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors',
              name === currentNetworkName
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
            ]"
          >
            <span>{{ name }}</span>
            <span v-if="name === currentNetworkName" class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧功能区 -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- 后端健康状态指示 -->
      <div class="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 bg-slate-100/70 dark:bg-zinc-800/60 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-zinc-800">
        <Activity class="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        <span class="font-mono text-[11px]">API 127.0.0.1:11211</span>
      </div>

      <!-- 浅色 / 深色 / 系统 切换器 -->
      <ThemeToggle />

      <!-- 用户登出 -->
      <button
        type="button"
        @click="handleLogout"
        class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
        title="退出登录"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>
