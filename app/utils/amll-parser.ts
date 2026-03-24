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

  // Match <p> elements with translate attribute and ttm:agent
  const pRegex = /<p\b[^>]*\bbegin="([^"]+)"[^>]*\btranslate="([^"]*)"[^>]*>([\s\S]*?)<\/p>|<p\b[^>]*\bbegin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
  let pMatch: RegExpExecArray | null
  
  while ((pMatch = pRegex.exec(ttml)) !== null) {
    // 匹配结果有两种情况：
    // 1. 有 translate 属性：pMatch[1]=begin, pMatch[2]=translate, pMatch[3]=innerHTML
    // 2. 无 translate 属性：pMatch[4]=begin, pMatch[5]=innerHTML
    const lineStartMs = timeToMs(pMatch[1] || pMatch[4]!)
    const translateAttr = pMatch[2] || '' // translate 属性值
    const innerHTML = pMatch[3] || pMatch[5] || ''
    const fullPTag = pMatch[0]!
    
    // 提取 ttm:agent 属性（演唱者 ID）
    const agentMatch = fullPTag.match(/\bttm:agent="([^"]+)"/)
    const singerId = agentMatch ? agentMatch[1] : undefined

    // 提取翻译歌词：优先使用 translate 属性，其次提取 <translate> 标签或 x-translation 内容
    let translatedLyric = translateAttr.trim()
    
    // 如果没有 translate 属性，尝试从 <translate> 子元素或 ttm:role="x-translation" 提取
    if (!translatedLyric) {
      // 匹配 <translate> 标签
      const translateTagRegex = /<translate[^>]*>([^<]*)<\/translate>/g
      let translateMatch: RegExpExecArray | null
      const translateTexts: string[] = []
      while ((translateMatch = translateTagRegex.exec(innerHTML)) !== null) {
        const text = translateMatch[1]?.trim()
        if (text) {
          translateTexts.push(text)
        }
      }
      
      // 匹配 <span ttm:role="x-translation">翻译内容</span>
      const xTransRegex = /<span[^>]*ttm:role="x-translation"[^>]*>([^<]*)<\/span>/g
      let xTransMatch: RegExpExecArray | null
      while ((xTransMatch = xTransRegex.exec(innerHTML)) !== null) {
        const text = xTransMatch[1]?.trim()
        if (text) {
          translateTexts.push(text)
        }
      }
      
      if (translateTexts.length > 0) {
        translatedLyric = translateTexts.join(' ')
      }
    }

    // 提取所有 span 标签和它们之间的文本（包括空格）
    const words: LyricWord[] = []
    let lastEndTime = lineStartMs
    
    // 使用 DOM 解析器提取 span 和它们之间的文本
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${innerHTML}</div>`, 'text/html')
    const container = doc.querySelector('div')
    
    if (container) {
      // 遍历所有子节点（包括文本节点和元素节点）
      for (const node of Array.from(container.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          // 文本节点 - 包含空格
          const text = node.textContent || ''
          if (text.trim() === '' && text.length > 0) {
            // 纯空格，为每个字符创建词
            for (let i = 0; i < text.length; i++) {
              const ch = text[i]!
              words.push({
                startTime: lastEndTime,
                endTime: lastEndTime,
                word: ch,
                romanWord: '',
                obscene: false
              })
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const span = node as HTMLElement
          if (span.tagName === 'SPAN') {
            // 检查是否有 begin 属性
            const beginAttr = span.getAttribute('begin')
            const endAttr = span.getAttribute('end')
            
            if (beginAttr) {
              const wStartMs = timeToMs(beginAttr)
              const wEndMs = endAttr ? timeToMs(endAttr) : wStartMs + 500
              const wText = span.textContent || ''
              
              // 跳过翻译和罗马音
              const roleAttr = span.getAttribute('ttm:role')
              if (!roleAttr) {
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
          }
        }
      }
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
        isDuet: false,
        singerId
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
          isDuet: false,
          singerId
        })
      }
    }
  }

  lines.sort((a, b) => a.startTime - b.startTime)
  return lines
}
