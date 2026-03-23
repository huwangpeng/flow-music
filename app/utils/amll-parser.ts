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

export function parseAmllLyrics(raw: string, format: 'ttml' | 'lrc'): LyricLine[] {
  if (format === 'ttml') {
    return parseTtml(raw)
  }
  return parseLrc(raw)
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: { time: number; text: string }[] = []
  const regex = /\[(\d+):(\d+)[.:](\d+)\](.*)/g
  let match: RegExpExecArray | null
  
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1]!)
    const sec = parseInt(match[2]!)
    const ms = parseInt(match[3]!.padEnd(3, '0').slice(0, 3))
    const text = (match[4] ?? '').trim()
    
    // Ignore pure metadata or empty lines
    if (text && !text.match(/^(作词|作曲|编曲|制作人|混音|录音)/)) {
      lines.push({ time: min * 60 * 1000 + sec * 1000 + ms, text })
    }
  }

  // Very important! Sort the lines chronologically
  lines.sort((a, b) => a.time - b.time)

  return lines.map((line, i) => {
    const next = lines[i + 1]
    const startTime = line.time
    // Standard LRC uses sentences as full words. End time overlaps are fixed here.
    const endTime = next ? Math.min(startTime + 5000, next.time - 50) : startTime + 5000

    return {
      words: [{
        startTime,
        endTime,
        word: line.text,
        romanWord: '',
        obscene: false
      }],
      translatedLyric: '',
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

  // Match <p> elements
  const pRegex = /<p\b[^>]*\bbegin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
  let pMatch: RegExpExecArray | null
  
  while ((pMatch = pRegex.exec(ttml)) !== null) {
    const lineStartMs = timeToMs(pMatch[1]!)
    const innerHTML = pMatch[2] ?? ''

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
        translatedLyric: '',
        romanLyric: '',
        startTime: words[0]!.startTime,
        endTime: lineEndMs,
        isBG: false,
        isDuet: false
      })
    } else {
      // Fallback if no spans found but p has text
      const cleanText = innerHTML.replace(/<[^>]+>/g, '').trim()
      if (cleanText) {
        lines.push({
          words: [{
            startTime: lineStartMs,
            endTime: lineStartMs + 3000,
            word: cleanText,
            romanWord: '',
            obscene: false
          }],
          translatedLyric: '',
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
