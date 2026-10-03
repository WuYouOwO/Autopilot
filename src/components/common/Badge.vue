<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'online' | 'relay' | 'offline' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' | 'cf' | 'blue'
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
        wrapper: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
        dotColor: 'bg-emerald-500',
      }
    case 'cf':
    case 'primary':
      return {
        wrapper: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60',
        dotColor: 'bg-[#f38020]',
      }
    case 'blue':
      return {
        wrapper: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
        dotColor: 'bg-blue-500',
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
    default:
      return {
        wrapper: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
        dotColor: 'bg-slate-400 dark:bg-zinc-400',
      }
  }
})

const sizeStyles = computed(() => {
  return props.size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors select-none',
      variantStyles.wrapper,
      sizeStyles
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
