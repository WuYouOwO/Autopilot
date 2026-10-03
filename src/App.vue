<template>
  <div id="app" class="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-150">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

// 初始化主题响应式侦听器
useTheme()
</script>
