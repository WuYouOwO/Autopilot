<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { Sun, Moon, Monitor } from 'lucide-vue-next'

const { theme, setTheme } = useTheme()
</script>

<template>
  <div class="inline-flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60">
    <button
      type="button"
      @click="setTheme('light')"
      :class="[
        'px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all duration-150',
        theme === 'light'
          ? 'bg-white text-slate-900 shadow-xs font-semibold'
          : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      ]"
      title="浅色模式 (Soft Light)"
    >
      <Sun class="w-3.5 h-3.5 text-orange-500" />
      <span class="hidden sm:inline">浅色</span>
    </button>
    <button
      type="button"
      @click="setTheme('dark')"
      :class="[
        'px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all duration-150',
        theme === 'dark'
          ? 'bg-zinc-900 text-zinc-100 shadow-xs font-semibold'
          : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      ]"
      title="深色模式 (Cloudflare Dark)"
    >
      <Moon class="w-3.5 h-3.5 text-orange-400" />
      <span class="hidden sm:inline">深色</span>
    </button>
    <button
      type="button"
      @click="setTheme('system')"
      :class="[
        'px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all duration-150',
        theme === 'system'
          ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
          : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      ]"
      title="跟随系统"
    >
      <Monitor class="w-3.5 h-3.5 text-slate-400" />
      <span class="hidden sm:inline">自动</span>
    </button>
  </div>
</template>
