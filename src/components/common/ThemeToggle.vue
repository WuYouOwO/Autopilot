<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { Sun, Moon, Monitor } from 'lucide-vue-next'

const { theme, setTheme, isDark } = useTheme()
</script>

<template>
  <div class="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/60 shadow-inner">
    <button
      type="button"
      @click="setTheme('light')"
      :class="[
        'px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150',
        theme === 'light'
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      ]"
      title="浅色模式"
    >
      <Sun class="w-3.5 h-3.5 text-amber-500" />
      <span class="hidden sm:inline">浅色</span>
    </button>
    <button
      type="button"
      @click="setTheme('dark')"
      :class="[
        'px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150',
        theme === 'dark'
          ? 'bg-zinc-900 text-zinc-100 shadow-sm'
          : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      ]"
      title="深色模式"
    >
      <Moon class="w-3.5 h-3.5 text-indigo-400" />
      <span class="hidden sm:inline">深色</span>
    </button>
    <button
      type="button"
      @click="setTheme('system')"
      :class="[
        'px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-150',
        theme === 'system'
          ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm'
          : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      ]"
      title="跟随系统"
    >
      <Monitor class="w-3.5 h-3.5" />
      <span class="hidden sm:inline">自动</span>
    </button>
  </div>
</template>
