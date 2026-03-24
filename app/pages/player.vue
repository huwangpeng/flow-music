<template>
  <div class="fixed inset-0 z-[100] flex bg-[#0a0a0a]">
    <!-- 全局高饱和度模糊背景 -->
    <div
      class="absolute inset-0 bg-cover bg-center blur-[80px] opacity-70 scale-125 saturate-150 transition-all duration-1000"
      :style="(track?.coverUrl || track?.coverArtId) ? `background-image: url(${track.coverUrl || `/api/cover/${track.coverArtId}`})` : ''"
    />
    <div class="absolute inset-0 bg-black/40" />

    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
      <button
        @click="router.back()"
        class="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 flex items-center gap-2"
      >
        <ChevronDown class="w-8 h-8" />
      </button>
    </div>

    <!-- 内容主体区：居中等比分割 -->
    <div class="relative z-10 w-full h-full max-w-[1600px] mx-auto flex flex-row items-center px-12 md:px-24">
      
      <!-- 左侧：封面 + 信息 + 播控 (约占 45%) -->
      <div class="w-[45%] flex-shrink-0 flex flex-col justify-center pr-12 lg:pr-24">
        <!-- 封面 -->
        <Transition name="cover-fade" mode="out-in">
          <div
            :key="track?.uuid || 'no-track'"
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
        </Transition>

        <!-- 歌名 + 歌手（左对齐） -->
        <div class="text-left mb-10 w-full max-w-[460px]">
          <h2 class="text-white text-3xl font-extrabold truncate tracking-tight">{{ track?.title || '未播放' }}</h2>
          <p class="text-gray-300 text-lg mt-2 truncate font-medium">{{ track?.artist || '-' }}</p>
          <p class="text-gray-500 text-sm mt-1 truncate">{{ track?.album || '' }}</p>
        </div>

        <!-- 进度条 -->
        <div class="w-full max-w-[460px] mb-8">
          <div
            class="w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative group"
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
            <span>{{ formatTime(currentTime) }}</span>
            <span>-{{ formatTime(duration - currentTime) }}</span>
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
      <!-- 【关键修改】：移除了 flex 和 justify-center，给 AMLL 一个绝对稳定、不可改变的块级容器环境，避免每次渲染父级触发 ResizeObserver 导致弹跳 -->
      <div class="w-[55%] h-[85vh] relative block mask-lyrics text-left overflow-hidden">
        <!-- 加载中 -->
        <div v-if="isLoadingLyrics" class="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <div class="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-4" />
          <p class="text-sm">正在获取歌词...</p>
        </div>

        <!-- AMLL 歌词 -->
        <AMLLyrics
          v-else-if="lyricsData && lyricsData.raw"
          :currentTime="currentTime"
          :is-playing="isPlaying"
          class="absolute inset-0 w-full h-full"
          @seek="handleSeek"
          :lyricsData="lyricsData"
          :tlyric="lyricsData?.tlyric"
        />

        <!-- 无歌词 -->
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
          <Music class="w-20 h-20 mb-4 opacity-20" />
          <p class="text-lg">暂无歌词</p>
          <p class="text-sm mt-2">享受音乐即可 🎵</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Music, ChevronDown, Play, Pause, SkipBack, SkipForward } from 'lucide-vue-next'
import AMLLyrics from '~/components/lyrics/AMLLyrics.vue'
import { useAudioStore } from '~/stores/audio'

definePageMeta({
  layout: false // 全屏页面不使用默认 layout
})

const router = useRouter()
const audioStore = useAudioStore()
const progressRef = ref<HTMLElement | null>(null)

const track = computed(() => audioStore.currentTrack)
const currentTime = computed(() => audioStore.currentTime)
const duration = computed(() => audioStore.duration)
const isPlaying = computed(() => audioStore.isPlaying)

const isLoadingLyrics = ref(false)
const lyricsData = ref<{ raw: string; format: 'ttml' | 'lrc'; tlyric?: string } | null>(null)

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

function formatTime(s: number) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function onSeekClick(e: MouseEvent) {
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const p = (e.clientX - rect.left) / rect.width
  audioStore.seek(Math.max(0, Math.min(1, p)) * duration.value)
}

function handleSeek(time: number) {
  audioStore.seek(time)
}

function handleKeyboardEvent(e: KeyboardEvent) {
  // 如果用户在输入框或可编辑元素中，不触发快捷键
  if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    return
  }

  switch (e.key) {
    case ' ':
      e.preventDefault()
      audioStore.togglePlay()
      break
    case 'ArrowUp':
      e.preventDefault()
      audioStore.playPrevious()
      break
    case 'ArrowDown':
      e.preventDefault()
      audioStore.playNext()
      break
    case 'Escape':
      e.preventDefault()
      router.back()
      break
  }
}

async function fetchLyrics(title: string, artist: string, trackId: string) {
  isLoadingLyrics.value = true
  lyricsData.value = null

  try {
    const data = await $fetch<{ success: boolean; format: 'ttml'|'lrc'; raw: string; tlyric?: string }>(
      `/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&trackId=${trackId}`
    )
    if (data.success && data.raw) {
       lyricsData.value = { raw: data.raw, format: data.format, tlyric: data.tlyric }
    }
  } catch (e) {
    console.warn('歌词获取失败:', e)
  } finally {
    isLoadingLyrics.value = false
  }
}

watch(track, (newTrack) => {
  if (newTrack) {
    fetchLyrics(newTrack.title, newTrack.artist, newTrack.uuid || '')
  } else {
    lyricsData.value = null
  }
}, { immediate: true })

onMounted(() => {
  if (!track.value) {
    router.push('/')
  }
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyboardEvent)
})

onUnmounted(() => {
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyboardEvent)
})
</script>

<style scoped>
.mask-lyrics {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

/* 封面切换动画 */
.cover-fade-enter-active,
.cover-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.cover-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.cover-fade-leave-to {
  opacity: 0;
  transform: scale(1.05);
}
</style>
