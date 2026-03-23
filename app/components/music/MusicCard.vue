<template>
  <div
    :class="[
      'group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer',
      viewMode === 'grid'
        ? 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 dark:bg-gray-900/50 dark:hover:bg-gray-900 dark:border-gray-800/50 dark:hover:border-gray-700 hover:shadow-xl'
        : 'bg-white hover:bg-gray-50 border border-gray-200 dark:bg-gray-900/50 dark:hover:bg-gray-900 dark:border-gray-800/50 dark:hover:border-gray-700',
      selected ? 'ring-2 ring-blue-500 dark:ring-white shadow-lg' : ''
    ]"
    @click="$emit('play', track)"
  >
    <!-- 网格视图 -->
    <template v-if="viewMode === 'grid'">
      <!-- 封面 -->
      <div class="aspect-square relative overflow-hidden">
        <img
          v-if="track.coverUrl"
          :src="track.coverUrl"
          :alt="track.title"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div v-else class="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Music class="w-12 h-12 text-gray-300 dark:text-gray-600" />
        </div>

        <!-- 播放按钮遮罩 -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
          <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <button class="w-14 h-14 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200 shadow-xl shadow-black/50">
              <Play class="w-6 h-6 text-black ml-1" />
            </button>
          </div>
        </div>

        <!-- 选择框 -->
        <div
          class="absolute top-2 right-2 z-10"
          @click.stop="toggleSelect"
        >
          <div
            :class="[
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
              selected ? 'bg-white border-white' : 'border-gray-400 hover:border-white bg-black/50'
            ]"
          >
            <svg v-if="selected" class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>

        <!-- 删除按钮 -->
        <div
          class="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          @click.stop="$emit('delete', track.id)"
        >
          <div class="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg">
            <Trash2 class="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      <!-- 信息 -->
      <div class="p-3">
        <h3 class="text-gray-900 dark:text-white font-medium truncate">{{ track.title }}</h3>
        <p class="text-gray-500 dark:text-gray-400 text-sm truncate mt-1">{{ track.artist || '未知艺术家' }}</p>
      </div>
    </template>

    <!-- 列表视图 -->
    <template v-else>
      <div class="flex items-center px-4 py-3">
        <!-- 选择框 -->
        <div
          class="flex-shrink-0"
          @click.stop="toggleSelect"
        >
          <div
            :class="[
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
              selected ? 'bg-white border-white' : 'border-gray-600 hover:border-gray-400'
            ]"
          >
            <svg v-if="selected" class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>

        <!-- 封面 -->
        <div class="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ml-3">
          <img
            v-if="track.coverUrl"
            :src="track.coverUrl"
            :alt="track.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Music class="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
        </div>

        <!-- 信息 -->
        <div class="flex-1 min-w-0 px-4">
          <h3 class="text-gray-900 dark:text-white font-medium truncate">{{ track.title }}</h3>
          <p class="text-gray-500 dark:text-gray-400 text-sm truncate">{{ track.artist || '未知艺术家' }}</p>
        </div>

        <!-- 专辑 -->
        <div class="w-48 text-gray-500 text-sm truncate px-4 hidden lg:block">
          {{ track.album || '未知专辑' }}
        </div>

        <!-- 时长 -->
        <div class="text-gray-500 text-sm w-20 text-right tabular-nums flex-shrink-0">
          {{ formatDuration(track.duration) }}
        </div>

        <!-- 删除按钮 -->
        <div
          class="w-12 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          @click.stop="$emit('delete', track.id)"
        >
          <div class="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center">
            <Trash2 class="w-4 h-4 text-white" />
          </div>
        </div>

        <!-- 播放按钮 -->
        <div class="w-12 flex items-center justify-center flex-shrink-0">
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-lg">
            <Play class="w-4 h-4 text-black ml-0.5" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Music, Play, Trash2 } from 'lucide-vue-next'
import type { AudioTrack } from '~/types/audio'

interface Props {
  track: AudioTrack
  viewMode: 'grid' | 'list'
  selected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [trackId: string]
  play: [track: AudioTrack]
  delete: [trackId: string]
}>()

const toggleSelect = () => {
  emit('select', props.track.id)
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
