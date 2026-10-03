<script setup lang="ts">
withDefaults(
  defineProps<{
    class?: string
    hoverable?: boolean
  }>(),
  {
    class: '',
    hoverable: false,
  }
)
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-[#162136] rounded-lg border border-slate-200/90 dark:border-[#23334d] shadow-xs transition-all duration-200 ease-out',
      hoverable ? 'hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-700/60' : '',
      $props.class
    ]"
  >
    <slot />
  </div>
</template>
