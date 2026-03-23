<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="modelValue"
          class="fixed inset-0 z-[100] flex bg-[#0a0a0a]"
        >
          <!-- 全局高饱和度模糊背景 -->
          <div
            class="absolute inset-0 bg-cover bg-center blur-[80px] opacity-70 scale-125 saturate-150 transition-all duration-1000"
            :style="(track?.coverUrl || track?.coverArtId) ? `background-image: url(${track.coverUrl || `/api/cover/${track.coverArtId}`})` : ''"
          />
          <div class="absolute inset-0 bg-black/40" />

          <!-- 内容主体区：居中等比分割 -->
          <div class="relative z-10 w-full h-full max-w-[1600px] mx-auto flex flex-row items-center px-12 md:px-24">
            
            <!-- 左侧：封面 + 信息 + 播控 (约占 45%) -->
            <div class="w-[45%] flex-shrink-0 flex flex-col justify-center pr-12 lg:pr-24">
              <!-- 封面 -->
              <div
                :class="['w-full max-w-[460px] aspect-square rounded-2xl overflow-hidden mb-12 transition-all duration-700', isPlaying ? 'scale-100 shadow-2xl' : 'scale-90 opacity-80 shadow-xl']"
                style="box-shadow: 0 40px 100px rgba(0,0,0,0.6)"
              >
                <img
                  v-if="track?.coverUrl || track?.coverArtId"
                  :src="track.coverUrl || `/api/cover/${track.coverArtId}`"
                  :alt="track.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-gray-800/80 flex items-center justify-center backdrop-blur-md">
                  <Music class="w-32 h-32 text-gray-400" />
                </div>
              </div>

              <!-- 歌名 + 歌手（左对齐） -->
              <div class="text-left mb-10 w-full max-w-[460px]">
                <h2 class="text-white text-3xl font-extrabold truncate tracking-tight">{{ track?.title || '未播放' }}</h2>
                <p class="text-gray-300 text-lg mt-2 truncate font-medium">{{ track?.artist || '-' }}</p>
                <p class="text-gray-500 text-sm mt-1 truncate">{{ track?.album || '' }}</p>
              </div>

              <!-- 进度条 -->
              <div class="w-full max-w-[460px] mb-8">
                <div
                  class="w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative group touch-none"
                  @mousedown="startSeek"
                  @touchstart="startSeek"
                  @click="onSeekClick"
                  ref="progressRef"
                >
                  <div
                    class="h-full bg-white/90 rounded-full transition-none"
                    :style="{ width: `${progressPercent}%` }"
                  />
                  <div
                    class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    :style="{ left: `calc(${progressPercent}% - 8px)` }"
                  />
                </div>
                <div class="flex justify-between text-xs text-white/50 mt-3 tabular-nums font-medium">
                  <span>{{ formatTime(displayTime) }}</span>
                  <span>-{{ formatTime(duration - displayTime) }}</span>
                </div>
              </div>

              <!-- 播控按钮 -->
              <div class="flex items-center space-x-8 max-w-[460px]">
                <button @click="audioStore.playPrevious()" class="text-white/60 hover:text-white transition-colors">
                  <SkipBack class="w-8 h-8" />
                </button>
                <button
                  @click="audioStore.togglePlay()"
                  class="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-xl border border-white/10"
                >
                  <Play v-if="!isPlaying" class="w-8 h-8 text-white ml-1" />
                  <Pause v-else class="w-8 h-8 text-white" />
                </button>
                <button @click="audioStore.playNext()" class="text-white/60 hover:text-white transition-colors">
                  <SkipForward class="w-8 h-8" />
                </button>
              </div>
            </div>

            <!-- 右侧：歌词部分 (约占 55%) -->
            <div class="flex-1 h-[85vh] w-full flex flex-col justify-center relative mask-lyrics text-left">
            <!-- 加载中 -->
            <div v-if="isLoadingLyrics" class="flex flex-col items-center justify-center h-full text-gray-500">
              <div class="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-4" />
              <p class="text-sm">正在获取歌词...</p>
            </div>

            <!-- AMLL 歌词 -->
            <AMLLyrics
              v-else-if="lyricsData && lyricsData.raw"
              :currentTime="currentTime"
              :is-playing="isPlaying"
              class="h-full"
              @seek="$emit('seek', $event)"
              :lyricsData="lyricsData"
            />

            <!-- 无歌词 -->
            <div v-else class="flex flex-col items-center justify-center h-full text-gray-600">
              <Music class="w-20 h-20 mb-4 opacity-20" />
              <p class="text-lg">暂无歌词</p>
              <p class="text-sm mt-2">享受音乐即可 🎵</p>
            </div>
          </div>

          <!-- 关闭 -->
          <button
            @click="$emit('update:modelValue', false)"
            class="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
          >
            <X class="w-6 h-6" />
          </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.mask-lyrics {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Music, X, Play, Pause, SkipBack, SkipForward } from 'lucide-vue-next'
import AMLLyrics from '~/components/lyrics/AMLLyrics.vue'
import type { AudioTrack, LyricLine } from '~/types/audio'
import { useAudioStore } from '~/stores/audio'

interface Props {
  modelValue: boolean
  track: AudioTrack | null
  currentTime: number
  duration: number
  isPlaying: boolean
  isLoadingLyrics: boolean
  lyricsData: { raw: string; format: 'ttml' | 'lrc' } | null
}

const props = withDefaults(defineProps<Props>(), {
  isLoadingLyrics: false,
  track: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  lyricsData: null
})
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  seek: [time: number]
}>()

const audioStore = useAudioStore()
const progressRef = ref<HTMLElement | null>(null)
const isSeeking = ref(false)
const dragProgress = ref(0)

const progressPercent = computed(() => {
  if (isSeeking.value) return dragProgress.value * 100
  if (!props.duration) return 0
  return (props.currentTime / props.duration) * 100
})

const displayTime = computed(() => {
  if (isSeeking.value) return dragProgress.value * props.duration
  return props.currentTime
})

function formatTime(s: number) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function onSeekClick(e: MouseEvent) {
  if (isSeeking.value) return // 正在拖拽时不触发点击
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const p = (e.clientX - rect.left) / rect.width
  emit('seek', Math.max(0, Math.min(1, p)) * props.duration)
}

function startSeek(event: MouseEvent | TouchEvent) {
  isSeeking.value = true
  const updateProgress = (e: MouseEvent | TouchEvent) => {
    if (!progressRef.value) return
    const rect = progressRef.value.getBoundingClientRect()
    const clientX = 'touches' in e ? (e.touches[0]?.clientX || 0) : e.clientX
    const p = (clientX - rect.left) / rect.width
    dragProgress.value = Math.max(0, Math.min(1, p))
  }

  updateProgress(event)

  const handleMove = (e: MouseEvent | TouchEvent) => {
    updateProgress(e)
  }

  const handleEnd = () => {
    isSeeking.value = false
    emit('seek', dragProgress.value * props.duration)
    window.removeEventListener('mousemove', handleMove)
    window.removeEventListener('mouseup', handleEnd)
    window.removeEventListener('touchmove', handleMove)
    window.removeEventListener('touchend', handleEnd)
  }

  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleEnd)
  window.addEventListener('touchmove', handleMove, { passive: false })
  window.addEventListener('touchend', handleEnd)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
