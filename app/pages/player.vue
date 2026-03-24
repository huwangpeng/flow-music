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
            :key="track?.id || track?.uuid || 'no-track'"
            :class="['w-full max-w-[460px] aspect-square rounded-2xl overflow-hidden mb-12 transition-all duration-700', isPlaying ? 'scale-100 shadow-2xl' : 'scale-90 opacity-80 shadow-xl']"
            style="box-shadow: 0 40px 100px rgba(0,0,0,0.6)"
          >
            <img
              v-if="track?.coverUrl || track?.coverArtId"
              :src="track.coverUrl || `/api/cover/${track.coverArtId}`"
              :alt="track?.title || '封面'"
              class="w-full h-full object-cover"
              loading="lazy"
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
        <div class="flex items-center justify-between max-w-[460px]">
          <button 
            @click="togglePlayMode()" 
            class="text-white/60 hover:text-white transition-colors relative group"
            :title="playModeLabel"
          >
            <component :is="playModeIcon" class="w-6 h-6" />
            <span 
              v-if="playMode === 'single'" 
              class="absolute -top-1 -right-1 text-[10px] font-bold text-white/80"
            >1</span>
          </button>
          
          <div class="flex items-center space-x-8">
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
          
          <button 
            @click="showPlaylist = !showPlaylist" 
            class="text-white/60 hover:text-white transition-colors"
            :class="{ 'text-white': showPlaylist }"
          >
            <ListMusic class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- 右侧：歌词部分 (约占 55%) -->
      <!-- 【关键修改】：移除了 flex 和 justify-center，给 AMLL 一个绝对稳定、不可改变的块级容器环境，避免每次渲染父级触发 ResizeObserver 导致弹跳 -->
      <div class="w-[55%] h-[85vh] relative block mask-lyrics text-left overflow-hidden">
        <!-- 播放列表面板 -->
        <Transition name="slide">
          <div 
            v-if="showPlaylist"
            class="absolute inset-0 z-30 bg-black/80 backdrop-blur-xl flex flex-col"
          >
            <div class="flex items-center justify-between p-6 border-b border-white/10">
              <h3 class="text-white text-xl font-bold">播放列表</h3>
              <button @click="showPlaylist = false" class="text-white/60 hover:text-white">
                <X class="w-6 h-6" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <div 
                v-for="(item, index) in audioStore.queue" 
                :key="item.id"
                @click="audioStore.play(item)"
                :class="[
                  'flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all mb-2',
                  index === audioStore.queueIndex 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                ]"
              >
                <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                  <img 
                    v-if="item.coverUrl || item.coverArtId"
                    :src="item.coverUrl || `/api/cover/${item.coverArtId}`"
                    class="w-full h-full object-cover"
                  />
                  <Music v-else class="w-6 h-6 text-gray-500 m-3" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ item.title }}</p>
                  <p class="text-sm opacity-60 truncate">{{ item.artist }}</p>
                </div>
                <span v-if="index === audioStore.queueIndex && isPlaying" class="text-xs text-white/40">
                  播放中
                </span>
              </div>
              <div v-if="audioStore.queue.length === 0" class="text-center text-white/40 py-12">
                播放列表为空
              </div>
            </div>
          </div>
        </Transition>
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
import { Music, ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, ListMusic, X } from 'lucide-vue-next'
import AMLLyrics from '~/components/lyrics/AMLLyrics.vue'
import { useAudioStore } from '~/stores/audio'

definePageMeta({
  layout: false // 全屏页面不使用默认 layout
})

const router = useRouter()
const audioStore = useAudioStore()
const progressRef = ref<HTMLElement | null>(null)

const track = computed(() => audioStore.currentTrack)
const storeCurrentTime = computed(() => audioStore.currentTime)
const duration = computed(() => audioStore.duration)
const isPlaying = computed(() => audioStore.isPlaying)

// 使用 requestAnimationFrame 实现流畅的进度条更新
const smoothCurrentTime = ref(audioStore.currentTime)
let animationFrame: number | null = null
let lastTime = 0
let lastStoreTime = audioStore.currentTime

function updateTime() {
  const now = performance.now()
  
  if (audioStore.isPlaying) {
    const delta = (now - lastTime) / 1000
    const storeDelta = audioStore.currentTime - lastStoreTime
    
    if (Math.abs(storeDelta - delta) > 0.5) {
      smoothCurrentTime.value = audioStore.currentTime
      lastStoreTime = audioStore.currentTime
    } else {
      smoothCurrentTime.value += delta
    }
    
    lastStoreTime = audioStore.currentTime
  } else {
    smoothCurrentTime.value = audioStore.currentTime
    lastStoreTime = audioStore.currentTime
  }
  
  lastTime = now
  animationFrame = requestAnimationFrame(updateTime)
}

const isLoadingLyrics = ref(false)
const lyricsData = ref<{ raw: string; format: 'ttml' | 'lrc'; tlyric?: string } | null>(null)
const showPlaylist = ref(false)

// 播放模式：'list' | 'single' | 'shuffle' | 'sequence'
type PlayMode = 'list' | 'single' | 'shuffle' | 'sequence'
const playMode = ref<PlayMode>('list')

const playModeIcon = computed(() => {
  switch (playMode.value) {
    case 'list': return Repeat
    case 'single': return Repeat1
    case 'shuffle': return Shuffle
    case 'sequence': return Repeat
    default: return Repeat
  }
})

const playModeLabel = computed(() => {
  switch (playMode.value) {
    case 'list': return '列表循环'
    case 'single': return '单曲循环'
    case 'shuffle': return '随机播放'
    case 'sequence': return '顺序播放'
    default: return '列表循环'
  }
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (smoothCurrentTime.value / duration.value) * 100
})

// 暴露 currentTime 给模板使用（时间显示）
const currentTime = smoothCurrentTime

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

function togglePlayMode() {
  const modes: PlayMode[] = ['list', 'single', 'shuffle', 'sequence']
  const currentIndex = modes.indexOf(playMode.value)
  playMode.value = modes[(currentIndex + 1) % modes.length]
  
  // 同步到 audioStore
  switch (playMode.value) {
    case 'list':
      audioStore.shuffle = false
      audioStore.repeatMode = 'all'
      break
    case 'single':
      audioStore.shuffle = false
      audioStore.repeatMode = 'one'
      break
    case 'shuffle':
      audioStore.shuffle = true
      audioStore.repeatMode = 'off'
      break
    case 'sequence':
      audioStore.shuffle = false
      audioStore.repeatMode = 'off'
      break
  }
}

function handleKeyboardEvent(e: KeyboardEvent) {
  // 如果用户在输入框或可编辑元素中，不触发快捷键
  if (isEditableElement(e.target as HTMLElement)) {
    return
  }

  // 阻止默认行为
  if ([' ', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) {
    e.preventDefault()
  }

  switch (e.key) {
    case ' ':
      audioStore.togglePlay()
      break
    case 'ArrowLeft':
      audioStore.playPrevious()
      break
    case 'ArrowRight':
      audioStore.playNext()
      break
    case 'Escape':
      router.back()
      break
  }
}

/**
 * 检测元素是否为可编辑元素
 */
function isEditableElement(element: HTMLElement | null): boolean {
  if (!element) return false
  
  // 检查常见的可编辑元素
  const editableTags = ['INPUT', 'TEXTAREA', 'SELECT']
  if (editableTags.includes(element.tagName)) {
    return true
  }
  
  // 检查 contenteditable 属性
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    return true
  }
  
  // 检查是否在可编辑元素内部
  let parent = element.parentElement
  while (parent) {
    if (parent.isContentEditable || parent.getAttribute('contenteditable') === 'true') {
      return true
    }
    if (editableTags.includes(parent.tagName)) {
      return true
    }
    parent = parent.parentElement
  }
  
  return false
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
  
  console.log('[Player] 页面已挂载，初始化键盘事件监听')
  
  // 启动流畅时间更新
  lastTime = performance.now()
  lastStoreTime = audioStore.currentTime
  animationFrame = requestAnimationFrame(updateTime)
  
  // 确保页面可以接收键盘事件
  // 设置 tabindex 让页面可以聚焦（如果还没有可聚焦元素）
  if (!document.activeElement || document.activeElement === document.body) {
    document.body.setAttribute('tabindex', '-1')
    document.body.focus()
    console.log('[Player] 页面获得初始焦点')
  }
  
  // 添加键盘事件监听（不使用 capture，让事件正常冒泡）
  window.addEventListener('keydown', handleKeyboardEvent)
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  console.log('[Player] 页面即将卸载，清理键盘事件监听')
  
  // 停止动画帧
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyboardEvent)
  
  // 移除可见性监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

/**
 * 处理页面可见性变化
 */
function handleVisibilityChange() {
  console.log('[Player] 页面可见性变化:', {
    hidden: document.hidden,
    visibilityState: document.visibilityState
  })
}
</script>

<style scoped>
.mask-lyrics {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

/* 封面切换动画 - 移动叠加效果 */
.cover-fade-enter-active,
.cover-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.cover-fade-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.cover-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}

/* 播放列表滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
