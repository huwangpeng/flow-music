<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[120] overflow-y-auto" role="dialog" aria-modal="true">
        <div
          class="fixed inset-0 bg-black/35 backdrop-blur-sm transition-opacity dark:bg-black/60"
          @click="handleClose"
        />

        <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-800 dark:bg-gray-900"
            @click.stop
          >
            <div v-if="title || $slots.header" class="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            <slot name="header">{{ title }}</slot>
              </h3>
              <button
                v-if="showClose"
                @click="handleClose"
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="p-6 text-gray-700 dark:text-gray-200">
              <slot />
            </div>

            <div v-if="$slots.footer" class="flex items-center justify-end space-x-3 border-t border-gray-200 p-6 dark:border-gray-800">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
