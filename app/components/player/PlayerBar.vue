<template>
  <div class="h-20 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 px-4 flex items-center">
    <div class="flex items-center w-1/4 min-w-0 pr-4">
      <div
        class="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
        @click="showLyrics = true"
      >
        <img
          v-if="currentTrack?.coverUrl || currentTrack?.coverArtId"
          :src="currentTrack.coverUrl || `/api/cover/${currentTrack.coverArtId}`"
          :alt="currentTrack.title"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <Music class="w-8 h-8 text-gray-400 dark:text-gray-600" />
        </div>
      </div>
      <div class="ml-3 min-w-0">
        <div class="text-gray-900 dark:text-white text-sm font-medium truncate">{{ currentTrack?.title || '未播放' }}</div>
        <div class="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">{{ currentTrack?.artist || '-' }}</div>
      </div>
    </div>

    <div class="flex flex-col items-center flex-1">
      <div class="flex items-center space-x-4 mb-2">
        <button
          @click="toggleShuffle"
          :class="[
            'p-2 rounded-lg transition-all duration-200',
            isShuffle
              ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          ]"
        >
          <Shuffle class="w-4 h-4" />
        </button>

        <button
          @click="playPrevious"
          class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-110"
        >
          <SkipBack class="w-5 h-5" />
        </button>

        <button
          @click="togglePlay"
          class="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg"
        >
          <Play v-if="!isPlaying" class="w-5 h-5 text-white dark:text-black ml-1" />
          <Pause v-else class="w-5 h-5 text-white dark:text-black" />
        </button>

        <button
          @click="playNext"
          class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-110"
        >
          <SkipForward class="w-5 h-5" />
        </button>

        <button
          @click="toggleRepeat"
          :class="[
            'p-2 rounded-lg transition-all duration-200',
            repeatMode !== 'off'
              ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          ]"
        >
          <Repeat class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center w-full max-w-lg space-x-3">
        <span class="text-xs text-gray-500 dark:text-gray-400 w-10 text-right tabular-nums">{{ formatTime(currentTime) }}</span>
        <div
          ref="progressBarRef"
          class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer group relative touch-none"
          @click="seek"
          @mousedown="startSeek"
          @touchstart="startSeek"
        >
          <div
            class="h-full bg-black dark:bg-white rounded-full relative overflow-hidden"
            :style="{ width: `${progress}%` }"
          />
          <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-black dark:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400 w-10 tabular-nums">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end w-1/4 min-w-[180px] space-x-3">
      <button
        @click="toggleMute"
        class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
      >
        <Volume2 v-if="volume > 0" class="w-5 h-5" />
        <VolumeX v-else class="w-5 h-5" />
      </button>
      <div
        ref="volumeBarRef"
        class="w-24 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer group"
        @click="setVolumeFromClick"
      >
        <div
          class="h-full bg-black dark:bg-white rounded-full relative"
          :style="{ width: `${volume * 100}%` }"
        >
          <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-black dark:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
        </div>
      </div>
      <button
        @click="showPlaylist = !showPlaylist"
        class="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-all duration-200"
      >
        <ListMusic class="w-5 h-5" />
      </button>
    </div>

    <PlaylistDrawer v-model="showPlaylist" />
    <LyricsModal
      v-model="showLyrics"
      :track="currentTrack"
      :current-time="currentTime"
      :duration="duration"
      :is-playing="isPlaying"
      :is-loading-lyrics="isLoadingLyrics"
      @seek="(t: number) => handleSeek(t)"
      :lyricsData="currentLyricsData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  ListMusic
} from 'lucide-vue-next'
import { useAudioStore } from '~/stores/audio'
import LyricsModal from '~/components/lyrics/LyricsModal.vue'
import PlaylistDrawer from '~/components/player/PlaylistDrawer.vue'

const audioStore = useAudioStore()
const showLyrics = ref(false)
const showPlaylist = ref(false)
const progressBarRef = ref<HTMLElement | null>(null)
const volumeBarRef = ref<HTMLElement | null>(null)
const isSeeking = ref(false)
const hoverProgress = ref<number | null>(null)

// 歌词状态
const isLoadingLyrics = ref(false)
const currentLyricsData = ref<{ raw: string; format: 'ttml' | 'lrc'; tlyric?: string | null } | null>(null)

const currentTrack = computed(() => audioStore.currentTrack)
const isPlaying = computed(() => audioStore.isPlaying)
const currentTime = computed(() => audioStore.currentTime)
const duration = computed(() => audioStore.duration)
const volume = computed(() => audioStore.volume)
const isShuffle = computed(() => audioStore.shuffle)
const repeatMode = computed(() => audioStore.repeatMode)

const handleSeek = (time: number) => {
  audioStore.seek(time)
}

const progress = computed(() => {
  if (isSeeking.value && hoverProgress.value !== null) return hoverProgress.value * 100
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

// ========== 歌词获取逻辑 ==========

async function fetchLyrics(title: string, artist: string) {
  isLoadingLyrics.value = true
  currentLyricsData.value = null

  try {
    const trackId = currentTrack.value?.uuid || ''
    const data = await $fetch<{ success: boolean; format: 'ttml'|'lrc'; raw: string; tlyric?: string | null }>(
      `/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&trackId=${trackId}`
    )
    if (data.success && data.raw) {
       currentLyricsData.value = { raw: data.raw, format: data.format, tlyric: data.tlyric }
    }
  } catch (e) {
    console.warn('歌词获取失败:', e)
  } finally {
    isLoadingLyrics.value = false
  }
}

// 切歌时自动拉取歌词
watch(currentTrack, (track) => {
  if (track) {
    fetchLyrics(track.title, track.artist)
  } else {
    currentLyricsData.value = null
  }
}, { immediate: true })

// ========== 播控逻辑 ==========

const togglePlay = () => {
  if (!currentTrack.value) return
  if (isPlaying.value) {
    audioStore.pause()
  } else {
    audioStore.play(currentTrack.value, audioStore.queue)
  }
}

const playPrevious = () => { audioStore.playPrevious() }
const playNext = () => { audioStore.playNext() }
const toggleShuffle = () => { audioStore.toggleShuffle() }
const toggleRepeat = () => { audioStore.setRepeatMode(repeatMode.value) }

const toggleMute = () => {
  audioStore.setMute(!audioStore.isMuted)
}

const setVolumeFromClick = (event: MouseEvent) => {
  if (!volumeBarRef.value) return
  const rect = volumeBarRef.value.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  audioStore.setVolume(Math.max(0, Math.min(1, percent)))
}

const calculateSeekPosition = (clientX: number): number => {
  if (!progressBarRef.value) return 0
  const rect = progressBarRef.value.getBoundingClientRect()
  const percent = (clientX - rect.left) / rect.width
  return Math.max(0, Math.min(1, percent))
}

const seek = (event: MouseEvent) => {
  const percent = calculateSeekPosition(event.clientX)
  audioStore.seek(percent * duration.value)
}

const startSeek = (event: MouseEvent | TouchEvent) => {
  isSeeking.value = true
  const clientX = 'touches' in event ? event.touches[0]?.clientX || 0 : event.clientX
  const percent = calculateSeekPosition(clientX)
  hoverProgress.value = percent

  const handleMove = (e: MouseEvent | TouchEvent) => {
    const cx = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX
    hoverProgress.value = calculateSeekPosition(cx)
  }

  const handleEnd = () => {
    isSeeking.value = false
    if (hoverProgress.value !== null) {
      audioStore.seek(hoverProgress.value * duration.value)
      hoverProgress.value = null
    }
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
  }

  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove, { passive: false })
  document.addEventListener('touchend', handleEnd)
}

const formatTime = (seconds: number) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>