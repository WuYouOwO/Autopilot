<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
  }
)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-2.5 py-1 text-xs rounded-md gap-1.5'
    case 'lg':
      return 'px-5 py-2.5 text-base rounded-lg gap-2.5'
    default:
      return 'px-3.5 py-1.5 text-sm rounded-md gap-2'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:border-zinc-700'
    case 'outline':
      return 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-zinc-900/60 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800'
    case 'ghost':
      return 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
    case 'danger':
      return 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-sm'
    default:
      return 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 active:bg-indigo-700'
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
      sizeClasses,
      variantClasses,
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-0.5 h-4 w-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <slot />
  </button>
</template>
