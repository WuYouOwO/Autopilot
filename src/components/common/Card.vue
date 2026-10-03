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
      'bg-white dark:bg-[#162136] rounded-lg border border-slate-200/90 dark:border-[#23334d] shadow-xs transition-all',
      $props.class
    ]"
  >
    <slot />
  </div>
</template>
