<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  open: boolean
  title?: string
  description?: string
  maxWidth?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- 背景遮罩 -->
    <div
      class="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm transition-opacity"
      @click="emit('close')"
    />

    <!-- 对话框主体 -->
    <div
      :class="[
        'relative z-10 w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150',
        maxWidth || 'max-w-lg'
      ]"
    >
      <div class="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h3 v-if="title" class="text-base font-semibold text-slate-900 dark:text-zinc-100">{{ title }}</h3>
          <p v-if="description" class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{{ description }}</p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6">
        <slot />
      </div>

      <div v-if="$slots.footer" class="px-6 py-3.5 bg-slate-50/70 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
