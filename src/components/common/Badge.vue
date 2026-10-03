<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'online' | 'relay' | 'offline' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral'
    size?: 'sm' | 'md'
    dot?: boolean
    pulse?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    dot: false,
    pulse: false,
  }
)

const variantStyles = computed(() => {
  switch (props.variant) {
    case 'online':
    case 'success':
      return {
        wrapper: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
        dotColor: 'bg-emerald-500',
      }
    case 'relay':
    case 'warning':
      return {
        wrapper: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
        dotColor: 'bg-amber-500',
      }
    case 'danger':
      return {
        wrapper: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
        dotColor: 'bg-rose-500',
      }
    case 'offline':
    case 'neutral':
      return {
        wrapper: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700',
        dotColor: 'bg-slate-400 dark:bg-zinc-500',
      }
    case 'primary':
      return {
        wrapper: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
        dotColor: 'bg-indigo-500',
      }
    default:
      return {
        wrapper: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
        dotColor: 'bg-slate-400 dark:bg-zinc-400',
      }
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
      variantStyles.wrapper
    ]"
  >
    <span
      v-if="dot"
      :class="[
        'w-1.5 h-1.5 rounded-full shrink-0',
        variantStyles.dotColor,
        pulse ? 'animate-pulse-subtle' : ''
      ]"
    />
    <slot />
  </span>
</template>
