<template>
  <button
    :type="type"
    :class="[
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
      variantClasses[variant],
      sizeClasses[size],
      className
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot v-if="!leftIcon && !rightIcon" />
    <component v-if="leftIcon" :is="leftIcon" class="w-4 h-4 mr-2" />
    <slot />
    <component v-if="rightIcon" :is="rightIcon" class="w-4 h-4 ml-2" />
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
  leftIcon?: Component
  rightIcon?: Component
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'default',
  size: 'default',
  disabled: false,
  className: ''
})

const variantClasses = {
  default: 'bg-dark-700 text-white hover:bg-dark-600',
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-dark-600 text-white hover:bg-dark-500',
  ghost: 'hover:bg-dark-800 text-gray-300 hover:text-white',
  outline: 'border border-dark-600 bg-transparent hover:bg-dark-800 text-white',
  destructive: 'bg-red-600 text-white hover:bg-red-700'
}

const sizeClasses = {
  default: 'h-10 py-2 px-4',
  sm: 'h-9 px-3 rounded-md',
  lg: 'h-11 px-8 rounded-md',
  icon: 'h-10 w-10'
}

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>
