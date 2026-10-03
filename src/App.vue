<template>
  <div id="app" class="min-h-screen bg-slate-50 dark:bg-[#0c1322] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-150">
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

// 初始化主题响应式侦听器
useTheme()
</script>
