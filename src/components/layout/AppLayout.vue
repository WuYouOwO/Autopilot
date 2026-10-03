<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import { usePolling } from '@/composables/usePolling'
import { useNetworkStore } from '@/stores/network'

const networkStore = useNetworkStore()

// 启动全局自适应智能轮询（后台标签自动挂起，页面活跃时每 3 秒刷新一次）
usePolling(async () => {
  await networkStore.fetchAll()
}, { intervalMs: 3000, pauseWhenHidden: true })
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0c1322] flex flex-col font-sans transition-colors duration-150">
    <AppHeader />
    <div class="flex-1 flex max-w-7xl w-full mx-auto">
      <AppSidebar />
      <main class="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>
