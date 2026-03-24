export interface LyricWord {
  startTime: number
  endTime: number
  word: string
  romanWord: string
  obscene: boolean
}

export interface LyricLine {
  words: LyricWord[]
  translatedLyric: string
  romanLyric: string
  startTime: number
  endTime: number
  isBG: boolean
  isDuet: boolean
  singerId?: string
}

export function parseAmllLyrics(raw: string, format: 'ttml' | 'lrc', tlyric?: string | null): LyricLine[] {
  if (format === 'ttml') {
    return parseTtml(raw)
  }
  return parseLrc(raw, tlyric)
}

// ==================== LRC 歌词解析器 ====================

/**
 * 判断是否是英文字符（包括半角符号）
 */
function isEnglishChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  // 英文字母 A-Z a-z (65-90, 97-122)
  // 半角符号：空格 (32), 标点符号等 (33-47, 58-64, 91-96, 123-126)
  return (code >= 65 && code <= 90) ||   // A-Z
         (code >= 97 && code <= 122) ||  // a-z
         (code >= 32 && code <= 47) ||   // 半角符号 1
         (code >= 58 && code <= 64) ||   // 半角符号 2
         (code >= 91 && code <= 96) ||   // 半角符号 3
         (code >= 123 && code <= 126)    // 半角符号 4
}

function parseLrc(lrc: string, tlyric?: string | null): LyricLine[] {
  const lines: { time: number; text: string }[] = []
  const regex = /\[(\d+):(\d+)[.:](\d+)\](.*)/g
  let match: RegExpExecArray | null
  
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1]!)
    const sec = parseInt(match[2]!)
    const ms = parseInt(match[3]!.padEnd(3, '0').slice(0, 3))
    const text = (match[4] ?? '').trim()
    
    if (text && !text.match(/^(作词 | 作曲 | 编曲 | 制作人 | 混音 | 录音)/)) {
      lines.push({ time: min * 60 * 1000 + sec * 1000 + ms, text })
    }
  }

  // 处理 tlyric（翻译歌词文件）
  let tLineMap = new Map<number, string>()
  if (tlyric) {
    const tLines: { time: number; text: string }[] = []
    const tRegex = /\[(\d+):(\d+)[.:](\d+)\](.*)/g
    let tMatch: RegExpExecArray | null
    while ((tMatch = tRegex.exec(tlyric)) !== null) {
      const min = parseInt(tMatch[1]!)
      const sec = parseInt(tMatch[2]!)
      const ms = parseInt(tMatch[3]!.padEnd(3, '0').slice(0, 3))
      const text = (tMatch[4] ?? '').trim()
      if (text) {
        tLines.push({ time: min * 60 * 1000 + sec * 1000 + ms, text })
      }
    }
    tLineMap = new Map(tLines.map(t => [t.time, t.text]))
  }

  // ========== 关键修复：先排序，再检测翻译 ==========
  // 1. 先按时间排序
  lines.sort((a, b) => a.time - b.time)

  // 2. 检测时间相同的歌词对（原句 + 翻译）
  const translationMap = new Map<number, string>()
  const translationIndices = new Set<number>()
  
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i]!
    const next = lines[i + 1]!
    
    // 如果下一句时间相同，且当前句还没有翻译，则下一句是翻译
    if (current.time === next.time && !tLineMap.has(current.time)) {
      translationMap.set(current.time, next.text)
      // 标记下一句的索引，稍后过滤
      translationIndices.add(i + 1)
    }
  }

  // 3. 过滤掉翻译歌词（已经放到 translationMap 中）
  const originalLines = lines.filter((_, index) => !translationIndices.has(index))

  return originalLines.map((line, i) => {
    const next = originalLines[i + 1]
    const startTime = line.time
    const endTime = next ? Math.min(startTime + 5000, next.time - 50) : startTime + 5000
    
    // 优先使用 tlyric 的翻译，其次使用时间相同的翻译
    const translatedLyric = tLineMap.get(startTime) || translationMap.get(startTime) || ''

    // LRC 歌词不是逐字的，直接整句作为一个 word
    return {
      words: [{
        startTime,
        endTime,
        word: line.text,
        romanWord: '',
        obscene: false
      }],
      translatedLyric,
      romanLyric: '',
      startTime,
      endTime,
      isBG: false,
      isDuet: false,
    }
  })
}

// ==================== TTML 歌词解析器 ====================

/**
 * HTML 实体解码函数
 */
function decodeHtmlEntities(text: string): string {
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/**
 * 时间字符串转毫秒
 * 支持格式：
 * - SS.mmm (纯秒数，如 "8.825") - Moon Halo 等
 * - MM:SS.mmm (分：秒，如 "00:15.226") - 春日影等
 * - HH:MM:SS.mmm (时：分：秒，如 "01:00:15.226")
 * - HH:MM:SS:frames (时：分：秒：帧)
 * - Xh, Xm, Xs, Xms, Xf, Xt (偏移时间)
 */
function timeToMs(timeStr: string): number {
  const timeStrTrimmed = timeStr.trim()
  
  // 1. 首先检查是否是纯秒数（Apple Music 常用格式，如 "8.825"）
  const secondsOnlyMatch = timeStrTrimmed.match(/^(\d+)\.(\d+)$/)
  if (secondsOnlyMatch) {
    const seconds = parseInt(secondsOnlyMatch[1]!)
    const milliseconds = parseInt(secondsOnlyMatch[2]!.padEnd(3, '0').slice(0, 3))
    return seconds * 1000 + milliseconds
  }
  
  // 2. 偏移时间：Xh, Xm, Xs, Xms, Xf, Xt
  const offsetMatch = timeStrTrimmed.match(/^(\d+(?:\.\d+)?)(h|m|s|ms|f|t)$/)
  if (offsetMatch) {
    const value = parseFloat(offsetMatch[1]!)
    const unit = offsetMatch[2]!
    
    switch (unit) {
      case 'h': return value * 3600 * 1000
      case 'm': return value * 60 * 1000
      case 's': return value * 1000
      case 'ms': return value
      case 'f': return Math.round(value * (1000 / 23.976)) // 假设 23.976 fps
      case 't': return Math.round(value * (1000 / 23.976)) // 假设 tick rate = frame rate
      default: return 0
    }
  }
  
  // 3. 时钟时间：分割冒号
  const timeParts = timeStrTrimmed.split(':')
  
  if (timeParts.length === 2) {
    // MM:SS.mmm 格式（如 "00:15.226"）
    const minutes = parseInt(timeParts[0]!)
    const secondsPart = timeParts[1]!
    const secondParts = secondsPart.split('.')
    const seconds = parseInt(secondParts[0]!)
    const milliseconds = secondParts[1] ? parseInt(secondParts[1].padEnd(3, '0').slice(0, 3)) : 0
    
    return minutes * 60 * 1000 + seconds * 1000 + milliseconds
  }
  
  if (timeParts.length === 3) {
    // HH:MM:SS.mmm 格式（如 "01:00:15.226"）
    const hours = parseInt(timeParts[0]!)
    const minutes = parseInt(timeParts[1]!)
    const secondsPart = timeParts[2]!
    
    // 检查是否有帧部分 (HH:MM:SS:frames)
    if (secondsPart.includes(':')) {
      const [seconds, frames] = secondsPart.split(':')
      return (hours * 3600 + minutes * 60 + parseInt(seconds!)) * 1000 + 
             Math.round(parseInt(frames!) * (1000 / 23.976))
    }
    
    // 检查是否有小数部分 (HH:MM:SS.mmm)
    const secondParts = secondsPart.split('.')
    const seconds = parseInt(secondParts[0]!)
    const milliseconds = secondParts[1] ? parseInt(secondParts[1].padEnd(3, '0').slice(0, 3)) : 0
    
    return hours * 3600 * 1000 + minutes * 60 * 1000 + seconds * 1000 + milliseconds
  }
  
  // 4. 只有秒数（整数）
  const seconds = parseFloat(timeStrTrimmed)
  return seconds * 1000
}

/**
 * 从 XML 字符串解析 TTML
 * 使用 DOMParser 而不是正则表达式
 */
function parseTtml(ttml: string): LyricLine[] {
  const lines: LyricLine[] = []
  
  // 使用 DOMParser 解析 XML
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(ttml, 'application/xml')
  
  // 检查解析错误
  const parseError = xmlDoc.querySelector('parsererror')
  if (parseError) {
    console.warn('TTML 解析错误:', parseError.textContent)
    return []
  }
  
  // 获取所有 <p> 元素
  const pElements = xmlDoc.getElementsByTagName('p')
  
  for (let i = 0; i < pElements.length; i++) {
    const pElement = pElements[i]!
    
    // 获取 begin 和 end 属性
    const beginAttr = pElement.getAttribute('begin')
    const endAttr = pElement.getAttribute('end')
    
    if (!beginAttr) {
      continue // 跳过没有 begin 属性的 <p>
    }
    
    const lineStartMs = timeToMs(beginAttr)
    const lineEndMs = endAttr ? timeToMs(endAttr) : lineStartMs + 5000
    
    // 获取 ttm:agent 属性（演唱者 ID）
    const singerId = pElement.getAttribute('ttm:agent') || undefined
    
    // 提取歌词内容
    const words: LyricWord[] = []
    let translatedLyric = ''
    
    // 递归处理子节点
    processChildNodes(pElement.childNodes, words, (translation) => {
      translatedLyric = translation
    }, lineStartMs, lineEndMs)
    
    // 如果没有逐字歌词，使用整行文本
    if (words.length === 0) {
      const text = pElement.textContent?.trim() || ''
      if (text) {
        words.push({
          startTime: lineStartMs,
          endTime: lineEndMs,
          word: text,
          romanWord: '',
          obscene: false
        })
      }
    }
    
    // 排序单词
    words.sort((a, b) => a.startTime - b.startTime)
    
    if (words.length > 0) {
      lines.push({
        words,
        translatedLyric,
        romanLyric: '',
        startTime: words[0]!.startTime,
        endTime: words[words.length - 1]!.endTime,
        isBG: false,
        isDuet: false,
        singerId
      })
    }
  }
  
  // 按开始时间排序
  lines.sort((a, b) => a.startTime - b.startTime)
  
  return lines
}

/**
 * 递归处理 XML 节点
 */
function processChildNodes(
  nodeList: NodeListOf<Node>,
  words: LyricWord[],
  setTranslation: (text: string) => void,
  defaultStartTime: number,
  defaultEndTime: number
) {
  let lastEndTime = defaultStartTime
  let hasTimedSpans = false  // 标记是否有逐字歌词（带 begin 的 span）
  
  // 第一次遍历：检测是否有逐字歌词
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i]!
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      if (element.tagName === 'span' && element.getAttribute('begin')) {
        hasTimedSpans = true
        break
      }
    }
  }
  
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i]!
    
    // 文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      
      // 如果是纯空格文本
      if (text && text.trim() === '') {
        if (hasTimedSpans) {
          // 逐字歌词模式：只在 span 标签之间添加单个空格
          // 检查这个文本节点是否在有 begin 的 span 之间
          const prevNode = i > 0 ? nodeList[i - 1] : null
          const nextNode = i < nodeList.length - 1 ? nodeList[i + 1] : null
          
          const prevIsTimedSpan = prevNode?.nodeType === Node.ELEMENT_NODE && 
                                  (prevNode as Element).tagName === 'span' && 
                                  (prevNode as Element).getAttribute('begin')
          const nextIsTimedSpan = nextNode?.nodeType === Node.ELEMENT_NODE && 
                                  (nextNode as Element).tagName === 'span' && 
                                  (nextNode as Element).getAttribute('begin')
          
          // 只有前后都是逐字 span 时，才添加空格 word
          if (prevIsTimedSpan && nextIsTimedSpan) {
            // 获取前一个单词和后一个单词的时间信息
            const prevWord = words.length > 0 ? words[words.length - 1] : null
            const nextSpanBegin = nextIsTimedSpan ? timeToMs((nextNode as Element).getAttribute('begin')!) : null
            
            // 计算空格的时间范围：从前一个单词结束到后一个单词开始
            const spaceStartTime = prevWord ? prevWord.endTime : lastEndTime
            const spaceEndTime = nextSpanBegin !== null ? nextSpanBegin : spaceStartTime + 100
            
            words.push({
              startTime: spaceStartTime,
              endTime: spaceEndTime,
              word: ' ',
              romanWord: '',
              obscene: false
            })
          }
        } else {
          // 普通 TTML 模式：保留自然空格，不单独创建 word
          // 空格会包含在父级文本节点的 decodedText 中
        }
      } 
      // 有实际内容的文本
      else if (text && text.trim() !== '') {
        const decodedText = decodeHtmlEntities(text)
        
        if (hasTimedSpans) {
          // 逐字歌词模式：清理文本，移除首尾空格，压缩中间多个空格为单个
          const cleanedText = decodedText.trim().replace(/\s+/g, ' ')
          if (cleanedText) {
            words.push({
              startTime: lastEndTime,
              endTime: lastEndTime,
              word: cleanedText,
              romanWord: '',
              obscene: false
            })
          }
        } else {
          // 普通 TTML 模式：保留原始空格
          words.push({
            startTime: lastEndTime,
            endTime: lastEndTime,
            word: decodedText,
            romanWord: '',
            obscene: false
          })
        }
      }
      continue
    }
    
    // 元素节点
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName
      
      // 处理 <span> 标签
      if (tagName === 'span') {
        const beginAttr = element.getAttribute('begin')
        const endAttr = element.getAttribute('end')
        const roleAttr = element.getAttribute('ttm:role')
        
        // 翻译歌词 (支持多种 role 格式)
        if (roleAttr === 'x-translation' || roleAttr === 'translation' || roleAttr === 'x-trans' || roleAttr === 'trans') {
          const translationText = element.textContent || ''
          setTranslation(decodeHtmlEntities(translationText.trim()))
          continue
        }
        
        // 罗马音歌词（不占用逐字位置）
        if (roleAttr === 'x-roman') {
          continue
        }
        
        // 背景音等其他 role，跳过
        if (roleAttr) {
          continue
        }
        
        // 逐字歌词（有 begin 属性）
        if (beginAttr) {
          const wStartMs = timeToMs(beginAttr)
          const wEndMs = endAttr ? timeToMs(endAttr) : wStartMs + 500
          const wText = decodeHtmlEntities(element.textContent || '')
          
          words.push({
            startTime: wStartMs,
            endTime: wEndMs,
            word: wText,
            romanWord: '',
            obscene: false
          })
          lastEndTime = wEndMs
        }
      }
      
      // 处理 <br> 标签（换行）
      else if (tagName === 'br') {
        // 忽略换行
      }
      
      // 递归处理子节点
      else {
        processChildNodes(element.childNodes, words, setTranslation, defaultStartTime, defaultEndTime)
      }
    }
  }
}
