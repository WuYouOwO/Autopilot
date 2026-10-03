<script setup lang="ts">
withDefaults(
  defineProps<{
    class?: string
  }>(),
  {
    class: '',
  }
)
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-[#191c22] rounded-md border border-slate-200 dark:border-[#262a33] shadow-xs transition-all',
      $props.class
    ]"
  >
    <slot />
  </div>
</template>
