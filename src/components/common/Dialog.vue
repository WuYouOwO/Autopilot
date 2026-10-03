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
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 背景遮罩 -->
        <div
          class="fixed inset-0 bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs transition-opacity"
          @click="emit('close')"
        />

        <!-- 对话框主体 -->
        <div
          :class="[
            'dialog-panel relative z-10 w-full bg-white dark:bg-[#162136] border border-slate-200/90 dark:border-[#23334d] rounded-xl shadow-xl dark:shadow-2xl overflow-hidden',
            maxWidth || 'max-w-lg'
          ]"
        >
          <div class="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 v-if="title" class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h3>
              <p v-if="description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ description }}</p>
            </div>
            <button
              type="button"
              @click="emit('close')"
              class="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-6">
            <slot />
          </div>

          <div v-if="$slots.footer" class="px-6 py-3.5 bg-slate-50/80 dark:bg-[#121c2e] border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
