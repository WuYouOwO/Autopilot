<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'cf'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    disabled: false,
    type: 'button',
  }
)

const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

const sizeStyles = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-xs px-2.5 py-1.5 rounded-md gap-1.5'
    case 'lg':
      return 'text-sm px-5 py-2.5 rounded-md gap-2'
    default:
      return 'text-xs px-3.5 py-2 rounded-md gap-2'
  }
})

const variantStyles = computed(() => {
  switch (props.variant) {
    case 'primary':
    case 'cf':
      return 'bg-[#f38020] hover:bg-[#e55b00] text-white shadow-xs border border-transparent font-semibold'
    case 'secondary':
      return 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700/60 shadow-xs'
    case 'outline':
      return 'bg-transparent text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800'
    case 'danger':
      return 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-transparent font-medium'
    case 'ghost':
      return 'bg-transparent text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
    default:
      return 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200'
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[baseStyles, sizeStyles, variantStyles]"
  >
    <Loader2 v-if="loading" class="w-3.5 h-3.5 animate-spin shrink-0" />
    <slot />
  </button>
</template>
