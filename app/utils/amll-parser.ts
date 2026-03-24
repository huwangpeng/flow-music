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
}

export function parseAmllLyrics(raw: string, format: 'ttml' | 'lrc', tlyric?: string | null): LyricLine[] {
  if (format === 'ttml') {
    return parseTtml(raw)
  }
  return parseLrc(raw, tlyric)
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
    
    if (text && !text.match(/^(作词|作曲|编曲|制作人|混音|录音)/)) {
      lines.push({ time: min * 60 * 1000 + sec * 1000 + ms, text })
    }
  }

  let tLines: { time: number; text: string }[] = []
  if (tlyric) {
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
  }

  const tLineMap = new Map(tLines.map(t => [t.time, t.text]))

  lines.sort((a, b) => a.time - b.time)

  return lines.map((line, i) => {
    const next = lines[i + 1]
    const startTime = line.time
    const endTime = next ? Math.min(startTime + 5000, next.time - 50) : startTime + 5000
    const translatedLyric = tLineMap.get(startTime) || ''

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

function parseTtml(ttml: string): LyricLine[] {
  const lines: LyricLine[] = []

  const timeToMs = (t: string): number => {
    const parts = t.split(':')
    if (parts.length === 2) {
      return Math.round((parseInt(parts[0]!) * 60 + parseFloat(parts[1]!)) * 1000)
    } else if (parts.length === 3) {
      return Math.round((parseInt(parts[0]!) * 3600 + parseInt(parts[1]!) * 60 + parseFloat(parts[2]!)) * 1000)
    }
    return 0
  }

  // Match <p> elements with translate attribute
  const pRegex = /<p\b[^>]*\bbegin="([^"]+)"[^>]*\btranslate="([^"]*)"[^>]*>([\s\S]*?)<\/p>|<p\b[^>]*\bbegin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
  let pMatch: RegExpExecArray | null
  
  while ((pMatch = pRegex.exec(ttml)) !== null) {
    // 匹配结果有两种情况：
    // 1. 有 translate 属性：pMatch[1]=begin, pMatch[2]=translate, pMatch[3]=innerHTML
    // 2. 无 translate 属性：pMatch[4]=begin, pMatch[5]=innerHTML
    const lineStartMs = timeToMs(pMatch[1] || pMatch[4]!)
    const translateAttr = pMatch[2] || '' // translate 属性值
    const innerHTML = pMatch[3] || pMatch[5] || ''

    // 提取翻译歌词：优先使用 translate 属性，其次提取 <translate> 标签内容
    let translatedLyric = translateAttr.trim()
    
    // 如果没有 translate 属性，尝试从 <translate> 子元素提取
    if (!translatedLyric) {
      const translateTagRegex = /<translate[^>]*>([^<]*)<\/translate>/g
      let translateMatch: RegExpExecArray | null
      const translateTexts: string[] = []
      while ((translateMatch = translateTagRegex.exec(innerHTML)) !== null) {
        const text = translateMatch[1]?.trim()
        if (text) {
          translateTexts.push(text)
        }
      }
      if (translateTexts.length > 0) {
        translatedLyric = translateTexts.join(' ')
      }
    }

    const spanRegex = /<span\b[^>]*\bbegin="([^"]+)"(?:[^>]*\bend="([^"]+)")?[^>]*>([^<]+)<\/span>/g
    let spanMatch: RegExpExecArray | null
    const words: LyricWord[] = []
    
    let lastSpanEnd = lineStartMs
    while ((spanMatch = spanRegex.exec(innerHTML)) !== null) {
      const wStartMs = timeToMs(spanMatch[1]!)
      const wEndMs = spanMatch[2] ? timeToMs(spanMatch[2]!) : wStartMs + 500
      const wText = spanMatch[3]!
      
      words.push({
        startTime: wStartMs,
        endTime: wEndMs,
        word: wText,
        romanWord: '',
        obscene: false
      })
      lastSpanEnd = Math.max(lastSpanEnd, wEndMs)
    }

    if (words.length > 0) {
      // Sort words just in case
      words.sort((a, b) => a.startTime - b.startTime)
      const lineEndMs = words[words.length - 1]!.endTime
      lines.push({
        words,
        translatedLyric,
        romanLyric: '',
        startTime: words[0]!.startTime,
        endTime: lineEndMs,
        isBG: false,
        isDuet: false
      })
    } else {
      // Fallback if no spans found but p has text
      const cleanText = innerHTML.replace(/<[^>]+>/g, '').replace(/<translate[^>]*>[^<]*<\/translate>/g, '').trim()
      if (cleanText) {
        lines.push({
          words: [{
            startTime: lineStartMs,
            endTime: lineStartMs + 3000,
            word: cleanText,
            romanWord: '',
            obscene: false
          }],
          translatedLyric,
          romanLyric: '',
          startTime: lineStartMs,
          endTime: lineStartMs + 3000,
          isBG: false,
          isDuet: false
        })
      }
    }
  }

  lines.sort((a, b) => a.startTime - b.startTime)
  return lines
}
