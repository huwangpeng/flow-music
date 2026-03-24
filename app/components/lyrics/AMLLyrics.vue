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

      <!-- 开头间奏符号 -->
      <div
        v-if="pauseSymbols && pauseSymbols.length > 0 && pauseSymbols[0] && pauseSymbols[0].index === -1"
        class="pause-line"
        :class="{ 'pause-active': isPauseActive(pauseSymbols[0]) }"
        :style="{ marginBottom: `${lineSpacing}pt` }"
      >
        <div 
          class="pause-text"
          :style="{ fontSize: `${baseFontSize}pt` }"
        >
          <span class="dot">•</span>
          <span class="dot">•</span>
          <span class="dot">•</span>
        </div>
      </div>
      
      <div
        v-for="(group, index) in groupedLyrics"
        :key="index"
        :ref="el => { if (el) lineRefs[index] = el as HTMLElement }"
        class="lyric-line cursor-pointer group"
        :class="{
          'is-active': activeIndex === index,
          'is-passed': activeIndex > index,
          'is-future': activeIndex < index,
          'has-translation': !!group.translation
        }"
        @click="handleSeek(group.original.startTime)"
      >
        <div 
          class="lyric-text block transition-all duration-700 will-change-transform font-black tracking-tight"
          :style="{ fontSize: `${baseFontSize}pt` }"
        >
          <!-- 原句歌词 -->
          <template v-if="isWordLevel(group.original)">
            <span 
              v-for="(word, wIndex) in group.original.words" 
              :key="wIndex"
              class="word-wrapper inline-block relative mr-[0.25em]"
            >
              <span class="word-base" :class="activeIndex === index ? 'text-white/90' : 'text-white/30'">{{ word.word }}</span>
              <span 
                class="word-highlight absolute top-0 left-0 overflow-hidden whitespace-nowrap"
                :style="{ 
                  clipPath: `inset(0 ${100 - getWordProgress(word)}% 0 0)`,
                  color: 'rgba(255, 255, 255, 0.9)'
                }"
              >{{ word.word }}</span>
            </span>
          </template>

          <template v-else>
            <span 
              class="line-content relative inline-block transition-opacity duration-300"
              :class="activeIndex === index ? 'text-white/90' : 'text-white/30'"
            >
              {{ getFullText(group.original.words) }}
            </span>
          </template>
        </div>
        
        <!-- 翻译歌词（靠右，缩小字体） -->
        <template v-if="group.translation">
          <div 
            class="translated-text-wrapper"
            :class="{ 'translate-enter': activeIndex === index }"
          >
            <div 
              class="translated-text"
              :style="{ fontSize: `${translationFontSize}pt` }"
            >
              {{ getFullText(group.translation.words) }}
            </div>
          </div>
        </template>
      </div>
      
      <!-- 歌词之间的暂停符号 -->
      <template v-for="(pause, pIndex) in pauseSymbols" :key="'pause-' + pIndex">
        <div
          v-if="pause.index >= 0"
          class="pause-line"
          :class="{ 'pause-active': isPauseActive(pause) }"
          :style="{ marginBottom: `${lineSpacing}pt` }"
        >
          <div 
            class="pause-text"
            :style="{ fontSize: `${baseFontSize}pt` }"
          >
            <span class="dot">•</span>
            <span class="dot">•</span>
            <span class="dot">•</span>
          </div>
        </div>
      </template>

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
  tlyric?: string | null
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

interface LyricGroup {
  original: LyricLine
  translation?: LyricLine
}

interface PauseSymbol {
  index: number
  startTime: number
  endTime: number
  duration: number
}

const amllLyrics = computed(() => {
  if (!props.lyricsData || !props.lyricsData.raw) return []
  try {
    return parseAmllLyrics(props.lyricsData.raw, props.lyricsData.format, props.tlyric)
  } catch (e) {
    console.warn('解析歌词失败:', e)
    return []
  }
})

const groupedLyrics = computed(() => {
  const lyrics = amllLyrics.value
  const groups: LyricGroup[] = []
  let i = 0
  
  while (i < lyrics.length) {
    const current = lyrics[i]!
    const next = lyrics[i + 1]!
    
    // 检测是否有下一行且时间戳相同
    if (next && Math.abs(next.startTime - current.startTime) < 50) {
      // 相同时间戳，配对为原句 + 翻译
      groups.push({
        original: current,
        translation: next
      })
      i += 2
    } else {
      // 单独一行
      groups.push({
        original: current
      })
      i++
    }
  }
  
  // 检测是否需要插入空歌词占位（当前时间没有歌词覆盖）
  const t = internalTime.value
  const hasActiveLyric = groups.some((group, index) => {
    const currentEnd = group.original.endTime || group.original.startTime
    const nextStart = groups[index + 1]?.original.startTime ?? Infinity
    
    return t >= group.original.startTime && t < nextStart
  })
  
  // 如果当前没有激活的歌词，且不在间奏中，添加空占位
  if (!hasActiveLyric && groups.length > 0) {
    const lastGroup = groups[groups.length - 1]!
    const lastEnd = lastGroup.original.endTime || lastGroup.original.startTime
    
    if (t > lastEnd) {
      // 在所有歌词之后，添加空占位
      groups.push({
        original: {
          words: [{
            word: '', startTime: lastEnd, endTime: lastEnd + 1000,
            romanWord: '',
            obscene: false
          }],
          startTime: lastEnd,
          endTime: lastEnd + 1000,
          translatedLyric: '',
          romanLyric: '',
          isBG: false,
          isDuet: false
        }
      })
    }
  }
  
  return groups
})

// 检测歌词间隔中的暂停符号位置
const pauseSymbols = computed(() => {
  const groups = groupedLyrics.value!
  const symbols: PauseSymbol[] = []!
  
  // 检测开头间奏（第一句歌词开始前的时间）
  if (groups.length > 0 && groups[0] && groups[0].original.startTime > 5000) {
    symbols.push({
      index: -1,
      startTime: 0,
      endTime: groups[0].original.startTime,
      duration: groups[0].original.startTime
    })
  }
  
  // 检测歌词之间的间隔
  for (let i = 0; i < groups.length - 1; i++) {
    const currentGroup = groups[i]!
    const nextGroup = groups[i + 1]!
    
    const currentEnd = currentGroup.original.endTime || currentGroup.original.startTime
    const nextStart = nextGroup.original.startTime
    
    const gap = nextStart - currentEnd
    
    // 检测间隔是否大于 5 秒（5000ms）
    if (gap > 5000) {
      symbols.push({
        index: i,
        startTime: currentEnd,
        endTime: nextStart,
        duration: gap
      })
    }
  }
  
  return symbols
})

// 计算最长歌词行的字符数
const maxLineLength = computed(() => {
  const lyrics = amllLyrics.value
  if (lyrics.length === 0) return 1
  return Math.max(...lyrics.map(line => {
    const text = getFullText(line.words)
    return text.length || 1
  }))
})

// 计算容器可用宽度（假设屏幕宽度的 60% 用于歌词显示）
const availableWidth = computed(() => {
  if (typeof window === 'undefined') return 800
  return window.innerWidth * 0.6 - 64 // 减去 padding
})

// 根据最长歌词和可用宽度计算字体大小
const baseFontSize = computed(() => {
  const maxWidth = availableWidth.value
  const maxLength = maxLineLength.value
  // 假设每个字符大约占用 0.6 倍字体大小的宽度
  const fontSize = maxWidth / (maxLength * 0.6)
  // 限制字体大小范围
  return Math.min(Math.max(fontSize, 24), 48)
})

// 主歌词激活时的大小
const activeFontSize = computed(() => {
  return baseFontSize.value * 1.08
})

// 副歌词字体大小（主歌词的 40%）
const translationFontSize = computed(() => {
  return baseFontSize.value * 0.4
})

// 副歌词容器高度（根据字体大小动态调整）
const translationHeight = computed(() => {
  return translationFontSize.value * 1.5
})

// 行距（主歌词大小的 50%）
const lineSpacing = computed(() => {
  return baseFontSize.value * 0.5
})

// 判断是否是逐字模式：如果任一单词的时间范围不是线性的整行，或者有超过 2 个 word，则认为是逐字
function isWordLevel(line: LyricLine) {
  if (!line || !line.words || line.words.length <= 1) return false
  // 避免将简单的单行 LRC 误判，检查是否有不重叠的时间段
  return line.words.length > 2 || props.lyricsData?.format === 'ttml'
}

// 判断暂停符号是否处于激活状态
function isPauseActive(pause: PauseSymbol) {
  const t = internalTime.value
  return t >= pause.startTime && t <= pause.endTime
}

// 获取暂停符号中每个点的透明度（依次循环激活）
function getDotOpacity(pause: PauseSymbol, dotIndex: number) {
  const t = internalTime.value
  if (t < pause.startTime) return 0.2
  if (t > pause.endTime) return 0.2
  
  const progress = (t - pause.startTime) / pause.duration
  // 每个点循环激活，周期为 1 秒
  const cycleDuration = 1.0
  const dotOffset = dotIndex * 0.3
  const cycleProgress = (progress * cycleDuration * 3 + dotOffset) % 1
  
  // 正弦波让点亮度平滑变化
  const baseOpacity = 0.3
  const activeOpacity = 0.9
  const wave = Math.sin(cycleProgress * Math.PI * 2) * 0.5 + 0.5
  
  return baseOpacity + wave * (activeOpacity - baseOpacity)
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
  const groups = groupedLyrics.value
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    if (group && group.original.startTime <= t + 150) { 
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
  margin-bottom: v-bind('`${lineSpacing}pt`');
}

.lyric-line.has-translation {
  margin-bottom: 0;
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

.translated-text-wrapper {
  height: 0;
  overflow: hidden;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 12%;
}

.translated-text-wrapper.translate-enter {
  height: v-bind('`${translationHeight}pt`');
}

.translated-text {
  font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', sans-serif !important;
  font-weight: 900 !important;
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.6);
}

.translated-text-wrapper.translate-enter .translated-text {
  opacity: 1;
  transform: translateX(-12px);
  color: rgba(255, 255, 255, 0.9);
}

.pause-line {
  opacity: 0;
  transition: opacity 1s ease;
  pointer-events: none;
  transform-origin: left center;
}

.pause-line.pause-active {
  opacity: 0.6;
}

.pause-text {
  font-weight: 900;
  color: rgba(255, 255, 255, 0.6);
  display: inline-block;
}

.dot {
  margin-right: 0.3em;
}

.dot:last-child {
  margin-right: 0;
}
</style>
