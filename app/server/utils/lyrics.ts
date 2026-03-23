import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { getLyricsPath } from './paths'

/**
 * 将歌词保存到本地文件系统
 * @param trackId 歌曲的 UUID
 * @param lyrics 歌词内容（字符串或 JSON 对象）
 */
export async function saveLyricsLocally(trackId: string, lyrics: any) {
  if (!lyrics) return
  
  try {
    const lyricsDir = getLyricsPath()
    if (!existsSync(lyricsDir)) {
      await mkdir(lyricsDir, { recursive: true })
    }
    
    const lyricsContent = typeof lyrics === 'string' ? lyrics : JSON.stringify(lyrics)
    const lyricsPath = join(lyricsDir, `${trackId}.json`)
    await writeFile(lyricsPath, lyricsContent, 'utf-8')
    console.log(`[LyricsUtils] Saved lyrics for ${trackId} to ${lyricsPath}`)
  } catch (error) {
    console.error(`[LyricsUtils] Failed to save lyrics for ${trackId}:`, error)
  }
}
