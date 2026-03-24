<template>
  <div class="relative w-full h-full overflow-hidden select-none" ref="containerRef" @wheel.prevent="handleWheel">
    <!-- 手动滚动时显示的时间提示 -->
    <Transition name="time-fade">
      <div 
        v-if="scrollTimeHint"
        class="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-white/90 text-lg font-bold tabular-nums"
      >
        {{ scrollTimeHint }}
      </div>
    </Transition>

    <div
      v-if="amllLyrics.length > 0"
      class="scroll-layer absolute w-full top-0 left-0 pr-8"
      :style="{ 
        transform: `translateY(${scrollOffset}px)`, 
        transition: isManualScrolling ? 'none' : 'transform 0.8s cubic-bezier(0.2, 0, 0, 1)' 
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
          <span 
            class="dot" 
            :style="{ 
              opacity: getDotOpacity(pauseSymbols[0], 0),
              transform: `translateY(${getDotLift(pauseSymbols[0], 0)}%)`,
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }"
          >•</span>
          <span 
            class="dot" 
            :style="{ 
              opacity: getDotOpacity(pauseSymbols[0], 1),
              transform: `translateY(${getDotLift(pauseSymbols[0], 1)}%)`,
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }"
          >•</span>
          <span 
            class="dot" 
            :style="{ 
              opacity: getDotOpacity(pauseSymbols[0], 2),
              transform: `translateY(${getDotLift(pauseSymbols[0], 2)}%)`,
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }"
          >•</span>
        </div>
      </div>
      
      <div
        v-for="(group, index) in groupedLyrics"
        :key="index"
        :ref="el => { if (el) lineRefs[index] = el as HTMLElement }"
        class="lyric-line cursor-pointer group"
        :class="{
          'is-active': activeIndices.includes(index),
          'is-passed': activeIndices.length > 0 && index < activeIndices[0]!,
          'is-future': activeIndices.length > 0 && index > activeIndices[activeIndices.length - 1]!,
          'has-translation': !!group.translation,
          'singer-v1': group.original.singerId === 'v1',
          'singer-v2': group.original.singerId === 'v2',
          'is-empty': group.original.words.length === 1 && group.original.words[0]!.word.trim() === ''
        }"
        @click="handleSeek(group.original.startTime)"
        :style="{
          transform: group.original.words.length === 1 && group.original.words[0]!.word.trim() === '' 
            ? `translateY(${getEmptyLineLift(group, index)}%)` 
            : undefined,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }"
      >
        <!-- 根据演唱者 ID 决定歌词位置：v1 靠左，v2 靠右，无 ID 也靠左 -->
        <div 
          class="lyric-content-wrapper flex w-full flex-col"
          :class="{
            'items-start': group.original.singerId === 'v1' || !group.original.singerId,
            'items-end': group.original.singerId === 'v2'
          }"
        >
          <div 
            class="lyric-text block transition-all duration-700 will-change-transform font-black tracking-tight"
            :style="{ fontSize: `${baseFontSize}pt` }"
            :class="{
              'text-left': group.original.singerId === 'v1' || !group.original.singerId,
              'text-right': group.original.singerId === 'v2'
            }"
          >
            <!-- 原句歌词 -->
            <template v-if="isWordLevel(group.original) && group.original.words.some(w => w.word.trim() !== '')">
              <template 
                v-for="(word, wIndex) in group.original.words" 
                :key="wIndex"
              >
                <!-- 空格 word 直接渲染为空格，不包裹在 word-wrapper 中 -->
                <span 
                  v-if="word.word.trim() === ''"
                  style="white-space: pre;"
                >{{ word.word }}</span>
                <!-- 非空格 word 使用逐字高亮效果 -->
                <span 
                  v-else
                  class="word-wrapper"
                  :style="{ 
                    transform: `translateY(${getWordLift(word, group.original, index)}%)`,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }"
                >
                  <span class="word-base" :class="activeIndices.includes(index) ? 'text-white/90' : 'text-white/30'">{{ word.word }}</span>
                  <span 
                    class="word-highlight absolute top-0 left-0 overflow-hidden whitespace-nowrap"
                    :style="{ 
                      clipPath: `inset(0 ${100 - getWordProgress(word)}% 0 0)`,
                      color: 'rgba(255, 255, 255, 0.9)'
                    }"
                  >{{ word.word }}</span>
                </span>
              </template>
            </template>

            <template v-else>
              <span 
                class="line-content relative inline-block transition-opacity duration-300"
                :class="activeIndices.includes(index) ? 'text-white/90' : 'text-white/30'"
              >
                {{ getFullText(group.original.words) }}
              </span>
            </template>
          </div>
          
          <!-- 翻译歌词（在原句歌词下方） -->
          <template v-if="group.translation">
            <div 
              class="translated-text-wrapper mt-1 translate-enter"
            >
              <div 
                class="translated-text"
                :style="{ fontSize: `${translationFontSize}pt` }"
                :class="{
                  'text-left': group.original.singerId === 'v1' || !group.original.singerId,
                  'text-right': group.original.singerId === 'v2'
                }"
              >
                {{ getFullText(group.translation.words) }}
              </div>
            </div>
          </template>
        </div>
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
            <span 
              class="dot" 
              :style="{ 
                opacity: getDotOpacity(pause, 0),
                transform: `translateY(${getDotLift(pause, 0)}%)`,
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }"
            >•</span>
            <span 
              class="dot" 
              :style="{ 
                opacity: getDotOpacity(pause, 1),
                transform: `translateY(${getDotLift(pause, 1)}%)`,
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }"
            >•</span>
            <span 
              class="dot" 
              :style="{ 
                opacity: getDotOpacity(pause, 2),
                transform: `translateY(${getDotLift(pause, 2)}%)`,
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }"
            >•</span>
          </div>
        </div>
      </template>

      <div class="h-[50vh]"></div>
    </div>
    
    <div v-else class="flex flex-col items-center justify-center h-full text-gray-600">
      <Music class="w-16 h-16 mb-4 opacity-20" />
      <p class="text-gray-500">暂无歌词</p>
    </div>

    <!-- 底部控制栏 -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
      <button 
        @click="togglePlayMode()" 
        class="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"
        :title="playModeLabel"
      >
        <component :is="playModeIcon" class="w-5 h-5" />
        <span 
          v-if="playMode === 'single'" 
          class="absolute -top-1 -right-1 text-[8px] font-bold text-white/80 bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
        >1</span>
      </button>
      
      <button 
        @click="showPlaylist = !showPlaylist" 
        class="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"
        :class="{ 'bg-white/20 text-white': showPlaylist }"
      >
        <ListMusic class="w-5 h-5" />
      </button>
    </div>

    <!-- 播放列表面板 -->
    <Transition name="slide-up">
      <div 
        v-if="showPlaylist"
        class="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 max-h-[50vh] z-30 bg-black/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10"
      >
        <div class="flex items-center justify-between p-4 border-b border-white/10">
          <h3 class="text-white font-bold">播放列表</h3>
          <button @click="showPlaylist = false" class="text-white/60 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="overflow-y-auto max-h-[40vh] p-2">
          <div 
            v-for="(item, index) in audioStore.queue" 
            :key="item.id"
            @click="audioStore.play(item)"
            :class="[
              'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all',
              index === audioStore.queueIndex 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            ]"
          >
            <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
              <img 
                v-if="item.coverUrl || item.coverArtId"
                :src="item.coverUrl || `/api/cover/${item.coverArtId}`"
                class="w-full h-full object-cover"
              />
              <Music v-else class="w-5 h-5 text-gray-500 m-2.5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ item.title }}</p>
              <p class="text-xs opacity-60 truncate">{{ item.artist }}</p>
            </div>
          </div>
          <div v-if="audioStore.queue.length === 0" class="text-center text-white/40 py-8 text-sm">
            播放列表为空
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Music, Repeat, Repeat1, Shuffle, ListMusic, X } from 'lucide-vue-next'
import { parseAmllLyrics } from '~/utils/amll-parser'
import type { LyricLine, LyricWord } from '~/utils/amll-parser'
import { useAudioStore } from '~/stores/audio'

interface Props {
  lyricsData: { raw: string; format: 'ttml' | 'lrc' } | null
  tlyric?: string | null
  currentTime: number
  isPlaying: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ seek: [time: number] }>()

const audioStore = useAudioStore()
const containerRef = ref<HTMLElement | null>(null)
const lineRefs = ref<HTMLElement[]>([])
const scrollOffset = ref(0)
const internalTime = ref(0)
const showPlaylist = ref(false)

// 播放模式
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

function togglePlayMode() {
  const modes: PlayMode[] = ['list', 'single', 'shuffle', 'sequence']
  const currentIndex = modes.indexOf(playMode.value)
  // 如果当前值不在数组中，默认从第一个开始；否则计算下一个索引
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % modes.length
  playMode.value = modes[nextIndex]!
  
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
const isManualScrolling = ref(false)
const scrollTimeHint = ref<string | null>(null)

let animationFrame: number | null = null
let lastTime = 0
let manualScrollTimeout: ReturnType<typeof setTimeout> | null = null
let visibleLineIndex = ref(-1)

interface LyricGroup {
  original: LyricLine
  translation?: LyricLine
}

  interface PauseSymbol {
    index: number
    startTime: number
    endTime: number
    duration: number
    glowStartTime: number
    glowEndTime: number
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
  
  // 直接遍历所有歌词行，保持原有的 singerId 和翻译
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i]!
    
    // 检查是否有翻译歌词
    if (line.translatedLyric && line.translatedLyric.trim()) {
      // 有翻译歌词，创建原句 + 翻译的组合
      groups.push({
        original: line,
        translation: {
          words: [{
            startTime: line.startTime,
            endTime: line.endTime,
            word: line.translatedLyric.trim(),
            romanWord: '',
            obscene: false
          }],
          translatedLyric: line.translatedLyric.trim(),
          romanLyric: '',
          startTime: line.startTime,
          endTime: line.endTime,
          isBG: false,
          isDuet: false
        }
      })
    } else {
      // 无翻译歌词，单独一行
      groups.push({
        original: line
      })
    }
  }
  
  // ========== 空行占位机制：在所有歌词之间预先插入空行 ==========
  const t = internalTime.value
  const resultGroups: LyricGroup[] = []
  const GAP_THRESHOLD = 3000 // 3 秒阈值，小于此值延长上一句
  
  for (let idx = 0; idx < groups.length; idx++) {
    const currentGroup = groups[idx]!
    resultGroups.push(currentGroup)
    
    // 在每句歌词之后都插入空行（除了最后一句）
    if (idx < groups.length - 1) {
      const nextGroup = groups[idx + 1]!
      const currentEnd = currentGroup.original.endTime || currentGroup.original.startTime
      const nextStart = nextGroup.original.startTime
      const gap = nextStart - currentEnd
      
      // 时间重叠时不插入空行（gap <= 0）
      if (gap <= 0) {
        // 时间重叠，不插入空行（多歌手合唱等情况）
        continue
      }
      
      // 如果间隔小于 3 秒，延长当前歌词的 endTime（不插入空行）
      if (gap < GAP_THRESHOLD) {
        // 找到刚添加的当前组，修改它的 endTime
        const lastAddedIdx = resultGroups.length - 1
        const extendedGroup: LyricGroup = {
          original: {
            ...resultGroups[lastAddedIdx]!.original,
            endTime: nextStart // 延长到下一句开始
          }
        }
        // 如果有翻译歌词，也需要延长翻译的 endTime
        if (extendedGroup.translation) {
          extendedGroup.translation = {
            ...extendedGroup.translation,
            endTime: nextStart,
            words: extendedGroup.translation.words.map((w, wordIdx) => 
              wordIdx === extendedGroup.translation!.words.length - 1 
                ? { ...w, endTime: nextStart }
                : w
            )
          }
        }
        // 如果是逐字歌词，也需要延长最后一个单词的 endTime
        if (extendedGroup.original.words.length > 0) {
          extendedGroup.original.words = extendedGroup.original.words.map((w, wordIdx) => 
            wordIdx === extendedGroup.original!.words.length - 1 
              ? { ...w, endTime: nextStart }
              : w
          )
        }
        resultGroups[lastAddedIdx] = extendedGroup
      } else {
        // 间隔大于等于 3 秒，插入空行占位
        resultGroups.push({
          original: {
            words: [{
              word: '',
              startTime: currentEnd,
              endTime: nextStart,
              romanWord: '',
              obscene: false
            }],
            startTime: currentEnd,
            endTime: nextStart,
            translatedLyric: '',
            romanLyric: '',
            isBG: false,
            isDuet: false
          }
        })
      }
    }
  }
  
  // 检查是否在所有歌词之后（最后一句已结束，但没有更多歌词）
  if (resultGroups.length > 0) {
    const lastGroup = resultGroups[resultGroups.length - 1]!
    const lastEnd = lastGroup.original.endTime || lastGroup.original.startTime
    
    // 如果当前时间在最后一句之后，且最后一句不是空行
    if (t > lastEnd && lastGroup.original.words.some(w => w.word.trim() !== '')) {
      // 添加空行占位
      resultGroups.push({
        original: {
          words: [{
            word: '',
            startTime: lastEnd,
            endTime: lastEnd + 1000,
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
  
  return resultGroups
})

  // 检测歌词间隔中的暂停符号位置
  const pauseSymbols = computed(() => {
    const groups = groupedLyrics.value!
    const symbols: PauseSymbol[] = []!
    
    // 检测开头间奏（第一句歌词开始前的时间 > 10秒）
    if (groups.length > 0 && groups[0] && groups[0].original.startTime > 10000) {
      const endTime = groups[0].original.startTime
      symbols.push({
        index: -1,
        startTime: 0,
        endTime,
        duration: endTime,
        glowStartTime: endTime - 9000,
        glowEndTime: endTime
      })
    }
    
    // 检测歌词之间的间隔
    for (let i = 0; i < groups.length - 1; i++) {
      const currentGroup = groups[i]!
      const nextGroup = groups[i + 1]!
      
      const currentEnd = currentGroup.original.endTime || currentGroup.original.startTime
      const nextStart = nextGroup.original.startTime
      
      const gap = nextStart - currentEnd
      
      // 检测间隔是否大于 10 秒（10000ms）
      if (gap > 10000) {
        symbols.push({
          index: i,
          startTime: currentEnd,
          endTime: nextStart,
          duration: gap,
          glowStartTime: nextStart - 9000,
          glowEndTime: nextStart
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
  const lyrics = amllLyrics.value
  
  // 区分中英文字符宽度系数，英文 0.45，中文 0.6
  let totalWidth = 0
  lyrics.forEach(line => {
    const text = getFullText(line.words)
    for (const char of text) {
      // 判断是否为中文字符（包括日文、韩文等 CJK 字符）
      if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(char)) {
        totalWidth += 0.6
      } else {
        totalWidth += 0.45
      }
    }
  })
  
  const avgWidth = lyrics.length > 0 ? totalWidth / lyrics.length : 1
  const fontSize = maxWidth / (avgWidth * 0.6)
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
  // 过滤掉纯空格的 word 后再判断，避免将包含空格的歌词误判为逐字歌词
  const nonEmptyWords = line.words.filter(w => w.word.trim() !== '')
  // 如果过滤后只剩下 0 或 1 个非空 word，则不是逐字模式
  if (nonEmptyWords.length <= 1) return false
  // 避免将简单的单行 LRC 误判，检查是否有不重叠的时间段
  return nonEmptyWords.length > 2 || props.lyricsData?.format === 'ttml'
}

  // 判断间奏符号是否应该显示（在整个间奏期间都显示）
  function isPauseActive(pause: PauseSymbol) {
    const t = internalTime.value
    return t >= pause.startTime && t <= pause.endTime
  }

  // 判断间奏符号是否处于呼吸灯亮起状态（在亮起区间内，3秒周期）
  function isPauseGlowing(pause: PauseSymbol) {
    const t = internalTime.value
    if (t < pause.glowStartTime || t > pause.glowEndTime) return false
    const elapsed = t - pause.glowStartTime
    const cycle = elapsed % 3000
    return cycle < 1500
  }

// 获取暂停符号中每个点的透明度（间奏开始前9秒，每隔3秒亮起一个，点亮后保持）
function getDotOpacity(pause: PauseSymbol, dotIndex: number) {
  const t = internalTime.value
  
  // 间奏开始前9秒的时刻
  const glowStartTime = pause.glowStartTime
  
  // 点0：glowStartTime 时刻亮起
  // 点1：glowStartTime + 3000 时刻亮起
  // 点2：glowStartTime + 6000 时刻亮起
  const dotLightTime = glowStartTime + dotIndex * 3000
  
  if (t >= dotLightTime) {
    return 1.0
  }
  
  return 0.2
}

watch(amllLyrics, () => {
  lineRefs.value = []
  nextTick(() => {
    // 只在非手动滚动时更新滚动位置
    if (!isManualScrolling.value) {
      updateActiveLine()
    }
  })
})

const activeIndex = ref(-1)
const activeIndices = ref<number[]>([]) // 支持多行同时 active

function getWordProgress(word: LyricWord) {
  const t = internalTime.value
  if (!word) return 0
  if (t < word.startTime) return 0
  if (t > word.endTime) return 100
  return ((t - word.startTime) / (word.endTime - word.startTime)) * 100
}

function getWordLift(word: LyricWord, line: LyricLine, lineIndex: number) {
  const t = internalTime.value
  // 检查该行是否在 activeIndices 中（支持多行同时 active）
  const isActiveLine = activeIndices.value.includes(lineIndex)
  
  if (!isActiveLine) {
    return 0
  }
  
  const wordProgress = getWordProgress(word)
  
  if (wordProgress >= 100) {
    return -5
  } else if (wordProgress > 0) {
    return -5 * (wordProgress / 100)
  } else {
    return 0
  }
}

/**
 * 计算空行的上移效果
 * 空行行为：
 * 1. 上一句歌词结束时，空行突然出现占据 active 位
 * 2. 空行不挤压空间（高度为 0）
 * 3. 下一句开始时，空行随着下一句一起上移
 */
function getEmptyLineLift(group: LyricGroup, lineIndex: number) {
  const t = internalTime.value
  
  // 检查是否是空行（word 为空）
  const isEmptyLine = group.original.words.length === 1 && group.original.words[0]!.word.trim() === ''
  if (!isEmptyLine) {
    return 0
  }
  
  // 检查空行是否 active
  const isActive = activeIndices.value.includes(lineIndex)
  if (isActive) {
    return -5 // 空行 active 时，上移 5%
  }
  
  // 检查是否是上一句（已经 passed）
  const isPassed = activeIndices.value.length > 0 && lineIndex < activeIndices.value[0]!
  if (isPassed) {
    return -5 // 上一句结束的空行，保持上移状态
  }
  
  return 0
}

function getDotLift(pause: PauseSymbol, dotIndex: number) {
  const t = internalTime.value
  
  if (!pause || !isPauseActive(pause)) {
    return 0
  }
  
  const dotLightTime = pause.glowStartTime + dotIndex * 3000
  
  if (t >= dotLightTime) {
    return -5
  }
  
  const timeUntilLight = dotLightTime - pause.glowStartTime
  const totalGlowTime = pause.glowEndTime - pause.glowStartTime
  
  if (totalGlowTime <= 0) {
    return 0
  }
  
  const progress = timeUntilLight / totalGlowTime
  return -5 * (1 - progress)
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

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function handleWheel(e: WheelEvent) {
  if (!containerRef.value || groupedLyrics.value.length === 0) return

  isManualScrolling.value = true
  
  // 清除之前的自动恢复计时器
  if (manualScrollTimeout) {
    clearTimeout(manualScrollTimeout)
  }

  // 计算新的滚动偏移
  const scrollSpeed = 0.8
  scrollOffset.value -= e.deltaY * scrollSpeed

  // 限制滚动范围
  const firstLine = lineRefs.value[0]
  const lastLine = lineRefs.value[lineRefs.value.length - 1]
  
  if (firstLine && lastLine) {
    const viewportHeight = containerRef.value.clientHeight
    const minOffset = -(lastLine.offsetTop + lastLine.clientHeight - viewportHeight * 0.35)
    const maxOffset = -(firstLine.offsetTop - viewportHeight * 0.65)
    
    scrollOffset.value = Math.max(minOffset, Math.min(maxOffset, scrollOffset.value))
  }

  // 找到当前视口中心的歌词行
  updateVisibleLine()

  // 设置5秒后自动回到当前歌词
  manualScrollTimeout = setTimeout(() => {
    isManualScrolling.value = false
    scrollTimeHint.value = null
    updateActiveLine()
  }, 5000)
}

function updateVisibleLine() {
  if (!containerRef.value) return
  
  const viewportHeight = containerRef.value.clientHeight
  const viewportCenter = -scrollOffset.value + viewportHeight * 0.35
  
  let closestIndex = -1
  let closestDistance = Infinity
  
  const groups = groupedLyrics.value
  for (let i = 0; i < lineRefs.value.length; i++) {
    const el = lineRefs.value[i]
    if (!el) continue
    
    const lineCenter = el.offsetTop + el.clientHeight / 2
    const distance = Math.abs(lineCenter - viewportCenter)
    
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = i
    }
  }
  
  if (closestIndex >= 0 && closestIndex !== visibleLineIndex.value) {
    visibleLineIndex.value = closestIndex
    const group = groups[closestIndex]
    if (group) {
      scrollTimeHint.value = formatTime(group.original.startTime)
    }
  }
}

let lastPropTime = -1
let accumulatedTime = 0

const loop = () => {
  const now = performance.now()
  
  if (props.isPlaying) {
    const delta = now - lastTime
    
    if (lastPropTime >= 0) {
      const expectedPropTime = lastPropTime + (delta / 1000)
      const actualPropTime = props.currentTime
      
      if (Math.abs(actualPropTime - expectedPropTime) > 1.0) {
        internalTime.value = props.currentTime * 1000
        accumulatedTime = props.currentTime * 1000
      } else {
        accumulatedTime += delta
        internalTime.value = accumulatedTime
      }
    } else {
      accumulatedTime = props.currentTime * 1000
      internalTime.value = accumulatedTime
    }
    
    lastPropTime = props.currentTime
  } else {
    accumulatedTime = props.currentTime * 1000
    internalTime.value = accumulatedTime
    lastPropTime = props.currentTime
  }
  
  lastTime = now
  updateActiveLine()
  animationFrame = requestAnimationFrame(loop)
}

function updateActiveLine() {
  const t = internalTime.value
  const groups = groupedLyrics.value
  
  // 找到所有当前应该 active 的行（时间重叠的多行）
  const newActiveIndices: number[] = []
  let primaryIdx = -1
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    if (!group || !group.original) continue
    
    // 条件：当前时间在该歌词的时间范围内（允许 150ms 的容差）
    const isActive = t >= group.original.startTime - 150 && t <= group.original.endTime
    if (isActive) {
      newActiveIndices.push(i)
      // 主 active 行是离当前时间最近的
      if (primaryIdx < 0 || Math.abs(group.original.startTime - t) < Math.abs(groups[primaryIdx]!.original.startTime - t)) {
        primaryIdx = i
      }
    }
  }
  
  // 更新 activeIndices - 只有当真正变化时才更新
  const hasChanged = newActiveIndices.length !== activeIndices.value.length || 
                     newActiveIndices.some((val, idx) => val !== activeIndices.value[idx])
  if (hasChanged) {
    activeIndices.value = newActiveIndices
  }
  
  // 更新主 activeIndex（用于滚动）
  if (primaryIdx !== activeIndex.value) {
    activeIndex.value = primaryIdx
    // 只在非手动滚动时更新滚动位置
    if (!isManualScrolling.value && primaryIdx >= 0) {
      calculateScroll(primaryIdx)
    }
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

onMounted(() => {
  accumulatedTime = props.currentTime * 1000
  internalTime.value = accumulatedTime
  lastTime = performance.now()
  animationFrame = requestAnimationFrame(loop)
  nextTick(() => {
    updateActiveLine()
  })
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (manualScrollTimeout) clearTimeout(manualScrollTimeout)
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
  /* 统一所有歌词行的总高度：翻译容器高度 + 行距 */
  margin-bottom: v-bind('`${lineSpacing}pt`');
}

.lyric-line.has-translation {
  /* 统一行间距，与普通歌词行相同 */
  margin-bottom: v-bind('`${lineSpacing}pt`');
}

/* 多演唱者布局 */
.lyric-content-wrapper {
  max-width: 100%;
}

.lyric-line.singer-v2 .lyric-content-wrapper {
  margin-left: auto;
}

.lyric-text {
  font-size: 26pt; 
  /* 强制应用 HarmonyOS Sans SC Black (900) */
  font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', sans-serif !important;
  font-weight: 900 !important;
  transform-origin: left center;
}

.lyric-line.singer-v1 .lyric-text {
  transform-origin: left center;
}

.lyric-line.singer-v2 .lyric-text {
  transform-origin: right center;
}

.lyric-line:not(.singer-v1):not(.singer-v2) .lyric-text {
  transform-origin: left center;
}

.word-wrapper {
  position: relative;
  display: inline-block;
}

/* 正在播放的活动行 */
.lyric-line.is-active {
  transform: scale(1.08);
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lyric-line.is-active.singer-v1 {
  transform: scale(1.08) translateX(6px);
}

.lyric-line.is-active.singer-v2 {
  transform: scale(1.08) translateX(-6px);
}

.lyric-line.is-active:not(.singer-v1):not(.singer-v2) {
  transform: scale(1.08) translateX(6px);
}

.lyric-line.is-active .lyric-text {
  /* 减弱发光强度，避免过亮 */
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
}

.lyric-line.is-active .word-highlight {
  /* 逐字亮度的柔和处理 */
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
}

.lyric-line.is-active .word-wrapper {
  /* 逐字歌词独立抬起 */
  display: inline-block;
  will-change: transform;
}

/* 空行占位（不挤压空间） */
.lyric-line.is-empty {
  height: 0;
  margin-bottom: 0;
  pointer-events: none;
  opacity: 0;
}

.lyric-line.is-empty.is-active {
  /* 空行 active 时显示，但高度仍为 0 */
  opacity: 0;
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
  height: v-bind('`${translationHeight}pt`');
  overflow: visible;
  position: relative;
  z-index: 10;
  text-align: left;
}

.lyric-line.singer-v2 .translated-text-wrapper {
  text-align: right;
}

.translated-text {
  font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', sans-serif !important;
  font-weight: 900 !important;
  opacity: 0.6;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  color: rgba(255, 255, 255, 0.6);
  position: relative;
  z-index: 11;
  display: block;
}

.translated-text-wrapper.translate-enter .translated-text {
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
}

.pause-line {
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
  transform-origin: left center;
}

.pause-line.pause-active {
  opacity: 1;
  transform: scale(1.08) translateX(6px);
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}

.pause-line.pause-active .dot {
  /* 间奏符号的每个点独立抬起 */
  display: inline-block;
  will-change: transform;
}

.pause-text {
  font-weight: 900;
  color: rgba(255, 255, 255, 0.9);
  display: inline-block;
  transform-origin: left center;
  transition: all 0.3s ease;
}

.dot {
  margin-right: 0;
}

.dot:last-child {
  margin-right: 0;
}

/* 时间提示淡入淡出动画 */
.time-fade-enter-active,
.time-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.time-fade-enter-from,
.time-fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(10px);
}

/* 播放列表上滑动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 20px);
  opacity: 0;
}
</style>
