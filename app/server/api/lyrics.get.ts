import { defineEventHandler, getQuery, createError } from 'h3'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { getLyricsPath } from '~/server/utils/paths'

interface LyricLine {
  time: number
  text: string
}

// ===== 工具函数 =====

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  const regex = /\[(\d+):(\d+)[.:](\d+)\]([^\[]*)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(lrc)) !== null) {
    const min = parseInt(match[1]!)
    const sec = parseInt(match[2]!)
    const ms = parseInt(match[3]!.padEnd(3, '0').slice(0, 3))
    const text = (match[4] ?? '').trim()
    // 过滤掉空行和纯元数据行
    if (text && !text.match(/^(作词|作曲|编曲|制作人|混音|录音)/)) {
      lines.push({ time: min * 60 + sec + ms / 1000, text })
    }
  }
  return lines
}

function parseTtml(ttml: string): LyricLine[] {
  const lines: LyricLine[] = []

  // amll-ttml-db 格式的时间轴：begin="mm:ss.mmm" 或 begin="hh:mm:ss.mmm"
  const timeToSec = (t: string): number => {
    const parts = t.split(':')
    if (parts.length === 2) {
      // mm:ss.mmm
      return parseInt(parts[0]!) * 60 + parseFloat(parts[1]!)
    } else if (parts.length === 3) {
      // hh:mm:ss.mmm
      return parseInt(parts[0]!) * 3600 + parseInt(parts[1]!) * 60 + parseFloat(parts[2]!)
    }
    return 0
  }

  // 提取 <p begin="..."> 级别的行
  const pRegex = /<p\b[^>]*\bbegin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
  let m: RegExpExecArray | null
  while ((m = pRegex.exec(ttml)) !== null) {
    const time = timeToSec(m[1]!)
    // 去掉所有内嵌标签，只保留文本
    const text = (m[2] ?? '').replace(/<[^>]+>/g, '').trim()
    if (text) lines.push({ time, text })
  }

  // 备用：提取 span begin
  if (lines.length === 0) {
    const spanRegex = /<span\b[^>]*\bbegin="([^"]+)"[^>]*>([^<]*)/g
    while ((m = spanRegex.exec(ttml)) !== null) {
      const time = timeToSec(m[1]!)
      const text = (m[2] ?? '').trim()
      if (text) lines.push({ time, text })
    }
  }

  // 按时间排序
  lines.sort((a, b) => a.time - b.time)
  return lines
}

// ===== 搜索 + 获取网易云歌曲 ID =====

async function searchNeteaseId(title: string, artist: string): Promise<number | null> {
  const keyword = encodeURIComponent(`${title} ${artist}`.trim())
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
    'Referer': 'https://music.163.com/',
  }
  try {
    const res = await fetch(
      `https://music.163.com/api/search/get/web?s=${keyword}&type=1&limit=1`,
      { headers }
    )
    const data = await res.json()
    const songs = data?.result?.songs
    if (!songs?.length) return null
    return songs[0].id as number
  } catch (e: any) {
    console.warn('[lyrics] Netease search failed:', e.message)
    return null
  }
}

// ===== AMLL DB 获取 TTML 逐字歌词 =====

async function fetchAmllTtml(neteaseId: number): Promise<LyricLine[] | null> {
  // amlldb.bikonoo.com 存储路径：/ncm-lyrics/{id}.ttml
  const urls = [
    `https://amlldb.bikonoo.com/ncm-lyrics/${neteaseId}.ttml`,
    // 官方 GitHub raw 格式（原始仓库，按曲库搜索匹配）
    `https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/main/ncm-lyrics/${neteaseId}.ttml`,
  ]

  const headers = {
    'User-Agent': 'flow-music-server/1.0',
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers })
      if (!res.ok) continue
      const ttml = await res.text()
      const lines = parseTtml(ttml)
      if (lines.length > 0) {
        console.log(`[lyrics] AMLL TTML found for ${neteaseId} from ${url}`)
        return lines
      }
    } catch {
      continue
    }
  }
  return null
}

// ===== 网易云 获取原始 LRC =====
async function fetchNeteaseLrc(neteaseId: number): Promise<string | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://music.163.com/',
  }
  try {
    const res = await fetch(`https://music.163.com/api/song/lyric?id=${neteaseId}&lv=1&kv=1&tv=-1`, { headers })
    const data = await res.json()
    return (data?.lrc?.lyric as string) || null
  } catch {
    return null
  }
}

// GET /api/lyrics?title=xxx&artist=xxx&trackId=yyy
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const title = String(query.title ?? '').trim()
  const artist = String(query.artist ?? '').trim()
  const trackId = String(query.trackId ?? '').trim()

  // 1. 优先尝试加载本地缓存的歌词文件
  if (trackId) {
    const localLyricsPath = join(getLyricsPath(), `${trackId}.json`)
    if (existsSync(localLyricsPath)) {
      try {
        const content = await readFile(localLyricsPath, 'utf-8')
        // 如果本地存的是 JSON 字符串（数组或对象），直接返回
        let raw = content
        let format: 'lrc' | 'ttml' = 'lrc'
        
        try {
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed)) {
            // 如果已经是解析后的数组格式，为了兼容前端期望的 raw 字符串逻辑，我们需要做处理
            // 或者直接返回 success: true 并让前端识别
            return { success: true, source: 'local', format: 'lrc', raw: content, trackId }
          }
          if (typeof parsed === 'string') raw = parsed
        } catch {}

        // 判断格式
        if (raw.includes('<tt') || raw.includes('<p')) format = 'ttml'
        
        return { success: true, source: 'local', format, raw, trackId }
      } catch (e) {
        console.warn('[lyrics] Failed to read local lyrics:', e)
      }
    }
  }

  if (!title) {
    throw createError({ statusCode: 400, message: '缺少 title 参数' })
  }

  // 2. 线上搜索逻辑
  const neteaseId = await searchNeteaseId(title, artist)
  if (!neteaseId) {
    console.warn('[lyrics] Could not find Netease song ID for:', title, artist)
    return { success: false, source: 'none' }
  }

  const ttml = await fetchAmllTtml(neteaseId)
  if (ttml) {
    return { success: true, source: 'amll-ttml', format: 'ttml', raw: ttml, neteaseId }
  }

  const lrc = await fetchNeteaseLrc(neteaseId)
  if (lrc) {
    return { success: true, source: 'netease-lrc', format: 'lrc', raw: lrc, neteaseId }
  }

  return { success: false, source: 'none' }
})
