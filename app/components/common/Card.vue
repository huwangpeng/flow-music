<template>
  <div :class="['card bg-dark-800 border-dark-700', className]">
    <div v-if="$slots.header" class="p-6 pb-4 border-b border-dark-700">
      <slot name="header" />
    </div>
    <div :class="['p-6', contentClass]">
      <slot />
    </div>
    <div v-if="$slots.footer" class="p-6 pt-4 border-t border-dark-700">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  className?: string
  contentClass?: string
}

withDefaults(defineProps<Props>(), {
  className: '',
  contentClass: ''
})
</script>
