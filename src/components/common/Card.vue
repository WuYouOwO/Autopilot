<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  padding?: boolean
}>()
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden transition-all duration-150"
  >
    <div v-if="$slots.header || title" class="px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
      <slot name="header">
        <div>
          <h3 v-if="title" class="text-sm font-semibold text-slate-900 dark:text-zinc-100">{{ title }}</h3>
          <p v-if="description" class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{{ description }}</p>
        </div>
      </slot>
      <slot name="header-actions" />
    </div>

    <div :class="padding !== false ? 'p-5' : ''">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-5 py-3 bg-slate-50/70 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800/80">
      <slot name="footer" />
    </div>
  </div>
</template>
