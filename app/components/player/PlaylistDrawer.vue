<template>
  <Transition name="slide">
    <div v-if="modelValue" class="fixed inset-y-0 right-0 z-50 w-80 md:w-96 bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
      <div class="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <ListMusic class="w-5 h-5 text-gray-500" />
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">播放队列 ({{ queue.length }})</h2>
        </div>
        <button @click="$emit('update:modelValue', false)" class="p-2 text-gray-500 hover:text-black dark:hover:text-white rounded-lg transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        <div v-if="queue.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
          <Music class="w-12 h-12 mb-2 opacity-20" />
          <p class="text-sm">当前队列为空</p>
        </div>
        <div
          v-for="(track, index) in queue"
          :key="track.id + index"
          @click="playTrack(track)"
          :class="[
            'group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200',
            currentTrackIndex === index 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
          ]"
        >
          <div class="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 mr-3">
             <img 
               v-if="track.coverUrl || track.coverArtId" 
               :src="track.coverUrl || `/api/cover/${track.coverArtId}`" 
               class="w-full h-full object-cover" 
             />
             <div v-else class="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
               <Music class="w-5 h-5 opacity-40" />
             </div>
             <div v-if="currentTrackIndex === index && isPlaying" class="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div class="flex space-x-0.5 items-end h-4">
                  <div class="w-0.5 bg-white animate-bounce-short" style="animation-delay: 0s"></div>
                  <div class="w-0.5 bg-white animate-bounce-short" style="animation-delay: 0.1s"></div>
                  <div class="w-0.5 bg-white animate-bounce-short" style="animation-delay: 0.2s"></div>
                </div>
             </div>
          </div>
          
          <div class="min-w-0 flex-1">
            <div class="text-sm font-bold truncate">{{ track.title }}</div>
            <div class="text-xs opacity-60 truncate">{{ track.artist }}</div>
          </div>

          <button 
            @click.stop="audioStore.removeFromQueue(track.id)"
            class="p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <button 
          @click="audioStore.clearQueue"
          class="w-full py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center"
        >
          <Trash2 class="w-4 h-4 mr-2" />
          清空所有队列
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X, Music, ListMusic, Trash2 } from 'lucide-vue-next'
import { useAudioStore } from '~/stores/audio'
import type { AudioTrack } from '~/types/audio'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const audioStore = useAudioStore()
const queue = computed(() => audioStore.queue)
const currentTrackIndex = computed(() => audioStore.queueIndex)
const isPlaying = computed(() => audioStore.isPlaying)

function playTrack(track: AudioTrack) {
  audioStore.play(track)
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.2);
  border-radius: 10px;
}

@keyframes bounce-short {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}
.animate-bounce-short {
  animation: bounce-short 0.6s ease-in-out infinite;
}
</style>
