<template>
  <div class="relative w-full h-full overflow-hidden select-none" ref="containerRef">
    <div
      v-if="amllLyrics.length > 0"
      class="scroll-layer absolute w-full top-0 left-0 pr-8"
      :style="{ 
        transform: `translateY(${scrollOffset}px)`, 
        transition: 'transform 0.8s cubic-bezier(0.2, 0, 0, 1)' 
      }"
    >
      <div class="h-[35vh]"></div>

      <div
        v-for="(line, index) in amllLyrics"
        :key="index"
        :ref="el => { if (el) lineRefs[index] = el as HTMLElement }"
        class="lyric-line cursor-pointer mb-10 group"
        :class="{
          'is-active': activeIndex === index,
          'is-passed': activeIndex > index,
          'is-future': activeIndex < index
        }"
        @click="handleSeek(line.startTime)"
      >
        <div class="lyric-text block transition-all duration-700 will-change-transform font-black tracking-tight">
          <!-- 情况 1：逐字歌词 (由解析器判断，通常是 TTML 格式且有多个 Span) -->
          <template v-if="isWordLevel(line)">
            <span 
              v-for="(word, wIndex) in line.words" 
              :key="wIndex"
              class="word-wrapper inline-block relative mr-[0.25em]"
            >
              <span class="word-base text-white/30">{{ word.word }}</span>
              <span 
                class="word-highlight absolute top-0 left-0 text-white/90 overflow-hidden whitespace-nowrap"
                :style="{ 
                  clipPath: `inset(0 ${100 - getWordProgress(word)}% 0 0)`
                }"
              >{{ word.word }}</span>
            </span>
          </template>

          <!-- 情况 2：非逐字歌词 (标准 LRC)，整行直接高亮 -->
          <template v-else>
            <span 
              class="line-content relative inline-block transition-opacity duration-300"
              :class="activeIndex === index ? 'text-white/90' : 'text-white/30'"
            >
              {{ getFullText(line.words) }}
            </span>
          </template>
        </div>
      </div>

      <div class="h-[50vh]"></div>
    </div>
    
    <div v-else class="flex flex-col items-center justify-center h-full text-gray-600">
      <Music class="w-16 h-16 mb-4 opacity-20" />
      <p class="text-gray-500">暂无歌词</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Music } from 'lucide-vue-next'
import { parseAmllLyrics } from '~/utils/amll-parser'
import type { LyricLine, LyricWord } from '~/utils/amll-parser'

interface Props {
  lyricsData: { raw: string; format: 'ttml' | 'lrc' } | null
  currentTime: number
  isPlaying: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ seek: [time: number] }>()

const containerRef = ref<HTMLElement | null>(null)
const lineRefs = ref<HTMLElement[]>([])
const scrollOffset = ref(0)
const internalTime = ref(0)

let animationFrame: number | null = null
let lastTime = 0

const amllLyrics = computed(() => {
  if (!props.lyricsData || !props.lyricsData.raw) return []
  try {
    return parseAmllLyrics(props.lyricsData.raw, props.lyricsData.format)
  } catch (e) {
    console.warn('解析歌词失败:', e)
    return []
  }
})

// 判断是否是逐字模式：如果任一单词的时间范围不是线性的整行，或者有超过 2 个 word，则认为是逐字
function isWordLevel(line: LyricLine) {
  if (!line || !line.words || line.words.length <= 1) return false
  // 避免将简单的单行 LRC 误判，检查是否有不重叠的时间段
  return line.words.length > 2 || props.lyricsData?.format === 'ttml'
}

watch(amllLyrics, () => {
  lineRefs.value = []
  nextTick(() => {
    updateActiveLine()
  })
})

const activeIndex = ref(-1)

function getWordProgress(word: LyricWord) {
  const t = internalTime.value
  if (!word) return 0
  if (t < word.startTime) return 0
  if (t > word.endTime) return 100
  return ((t - word.startTime) / (word.endTime - word.startTime)) * 100
}

function getFullText(words: LyricWord[]) {
  if (!words) return ''
  return words.map(w => w.word).join('')
}

function handleSeek(timeMs: number) {
  if (timeMs !== undefined) {
    emit('seek', timeMs / 1000)
    internalTime.value = timeMs
    updateActiveLine()
  }
}

const loop = () => {
  const now = performance.now()
  const delta = now - lastTime
  lastTime = now

  if (props.isPlaying) {
    const expectedMs = props.currentTime * 1000
    if (Math.abs(internalTime.value - expectedMs) < 1000) {
      internalTime.value += delta
    } else {
      internalTime.value = expectedMs
    }
  } else {
    internalTime.value = props.currentTime * 1000
  }

  updateActiveLine()
  animationFrame = requestAnimationFrame(loop)
}

function updateActiveLine() {
  const t = internalTime.value
  let idx = -1
  const lyrics = amllLyrics.value
  
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i]
    if (line && line.startTime <= t + 150) { 
      idx = i
    } else {
      break
    }
  }

  if (idx !== activeIndex.value) {
    activeIndex.value = idx
    calculateScroll(idx)
  }
}

function calculateScroll(idx: number) {
  if (idx < 0 || !lineRefs.value[idx]) return
  
  const lineEl = lineRefs.value[idx]
  const lineCenter = lineEl.offsetTop + lineEl.clientHeight / 2
  const viewportHeight = containerRef.value ? containerRef.value.clientHeight : window.innerHeight * 0.85
  const targetOffset = -(lineCenter - viewportHeight * 0.35)
  
  scrollOffset.value = targetOffset
}

watch(() => props.currentTime, (t) => {
  const expectedMs = t * 1000
  if (Math.abs(internalTime.value - expectedMs) >= 800) {
    internalTime.value = expectedMs
    updateActiveLine()
  }
})

onMounted(() => {
  internalTime.value = props.currentTime * 1000
  lastTime = performance.now()
  animationFrame = requestAnimationFrame(loop)
  nextTick(() => {
    updateActiveLine()
  })
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
@import url('https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css');

.scroll-layer {
  will-change: transform;
}

.lyric-line {
  line-height: 1.4;
  transform-origin: left center;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lyric-text {
  font-size: 26pt; 
  /* 强制应用 HarmonyOS Sans SC Black (900) */
  font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', sans-serif !important;
  font-weight: 900 !important;
  transform-origin: left center;
}

/* 正在播放的活动行 */
.lyric-line.is-active {
  transform: scale(1.08) translateX(6px); /* 减小一点位移 */
}

.lyric-line.is-active .lyric-text {
  /* 减弱发光强度，避免过亮 */
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
}

.lyric-line.is-active .word-highlight {
  /* 逐字亮度的柔和处理 */
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
}

/* 已经播放过的歌词 */
.lyric-line.is-passed {
  opacity: 0.15;
  transform: scale(0.92);
}

/* 未来歌词 */
.is-future {
  opacity: 0.3;
  transform: scale(0.95);
}

.lyric-line:hover {
  opacity: 1 !important;
  transform: scale(1.02) translateX(4px);
  filter: blur(0px) !important;
}
</style>
