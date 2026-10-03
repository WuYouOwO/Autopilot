<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'warning' | 'success' | 'cf'
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

const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

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
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-transparent font-semibold focus:ring-blue-500'
    case 'warning':
      return 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs border border-transparent font-semibold focus:ring-orange-500'
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 text-white shadow-xs border border-transparent font-semibold focus:ring-red-500'
    case 'success':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-transparent font-semibold focus:ring-emerald-500'
    case 'secondary':
      return 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs focus:ring-slate-400'
    case 'outline':
      return 'bg-transparent text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
    case 'ghost':
      return 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
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
