<template>
  <button
    :type="type"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50 ring-offset-white dark:ring-offset-gray-950',
      'active:scale-[0.98]',
      variantClasses[variant],
      sizeClasses[size],
      className
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span
      v-if="loading"
      class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <component v-else-if="leftIcon" :is="leftIcon" class="h-4 w-4 shrink-0" />
    <slot />
    <component v-if="rightIcon" :is="rightIcon" class="h-4 w-4 shrink-0" />
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

interface Props {
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  leftIcon?: Component
  rightIcon?: Component
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'default',
  size: 'default',
  disabled: false,
  loading: false,
  className: ''
})

const variantClasses = {
  default: 'border border-gray-200 bg-white text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:hover:border-gray-700 dark:hover:bg-gray-800',
  primary: 'bg-gray-900 text-white shadow-sm shadow-gray-900/10 hover:-translate-y-0.5 hover:bg-black hover:shadow-md dark:bg-white dark:text-black dark:hover:bg-gray-100',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
  outline: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800',
  destructive: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md'
}

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10'
}

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>
