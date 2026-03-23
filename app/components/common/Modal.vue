<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" role="dialog">
    <!-- 背景遮罩 -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="handleClose"
    ></div>

    <!-- 对话框 -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div 
        class="relative bg-dark-800 rounded-lg border border-dark-700 shadow-xl max-w-md w-full transform transition-all"
        @click.stop
      >
        <!-- 头部 -->
        <div v-if="title || $slots.header" class="flex items-center justify-between p-6 border-b border-dark-700">
          <h3 class="text-lg font-semibold text-white">
            <slot name="header">{{ title }}</slot>
          </h3>
          <button 
            v-if="showClose"
            @click="handleClose"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 内容 -->
        <div class="p-6">
          <slot />
        </div>

        <!-- 底部 -->
        <div v-if="$slots.footer" class="flex items-center justify-end space-x-3 p-6 border-t border-dark-700">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface Props {
  isOpen: boolean
  title?: string
  showClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showClose: true
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  close: []
}>()

function handleClose() {
  emit('update:isOpen', false)
  emit('close')
}
</script>
