import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { getLyricsPath } from './paths'

function parseMetingLyrics(lrc: string): string {
  const lines = lrc.split('\n')
  const result: string[] = []

  // 支持全角/半角括号，并处理括号周围的可选空格
  const regex = /^(\[\d{2}:\d{2}(?:\.\d{2,3})?\])\s*(.+?)\s*[（(](.+?)\s*[）)]\s*$/

  for (const line of lines) {
    const lineTrimmed = line.trim()
    if (!lineTrimmed) {
      result.push('')
      continue
    }

    const match = lineTrimmed.match(regex)
    if (match) {
      const timeTag = match[1]
      const original = match[2]?.trim() ?? ''
      const translated = match[3]?.trim()
      
      // 格式转换：[xx:xx] 原歌词（翻译歌词）-> [xx:xx] 原歌词\n[xx:xx] 翻译歌词
      result.push(`${timeTag}${original}`)
      result.push(`${timeTag}${translated}`)
    } else {
      result.push(lineTrimmed)
    }
  }

  return result.join('\n')
}

export async function saveLyricsLocally(trackId: string, lyrics: any) {
  if (!lyrics) return

  try {
    const lyricsDir = getLyricsPath()
    if (!existsSync(lyricsDir)) {
      await mkdir(lyricsDir, { recursive: true })
    }

    const lrcContent = typeof lyrics === 'string' ? lyrics : JSON.stringify(lyrics)
    const parsedContent = parseMetingLyrics(lrcContent)

    const lyricsPath = join(lyricsDir, `${trackId}.lrc`)
    await writeFile(lyricsPath, parsedContent, 'utf-8')
    console.log(`[LyricsUtils] Saved lyrics for ${trackId}`)
  } catch (error) {
    console.error(`[LyricsUtils] Failed to save lyrics for ${trackId}:`, error)
  }
}