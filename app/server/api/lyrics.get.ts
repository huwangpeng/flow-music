import { defineEventHandler, getQuery, createError } from 'h3'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
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
    if (text && !text.match(/^(作词 | 作曲 | 编曲 | 制作人 | 混音 | 录音)/)) {
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

// ===== TTML 转 LRC 格式 =====
function ttmlToLrc(ttml: string): string {
  const lines = parseTtml(ttml)
  const lrcLines: string[] = []
  
  for (const line of lines) {
    const min = Math.floor(line.time / 60)
    const sec = Math.floor(line.time % 60)
    const ms = Math.floor((line.time % 1) * 1000)
    const timeTag = `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}]`
    lrcLines.push(`${timeTag}${line.text}`)
  }
  
  return lrcLines.join('\n')
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

async function fetchAmllTtml(neteaseId: number): Promise<string | null> {
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
      // 验证 TTML 是否包含有效内容
      const lines = parseTtml(ttml)
      if (lines.length > 0) {
        console.log(`[lyrics] AMLL TTML found for ${neteaseId} from ${url}`)
        return ttml
      }
    } catch {
      continue
    }
  }
  return null
}

// ===== 保存 TTML 和 LRC 到本地 =====
async function saveTtmlAndLrc(trackId: string, ttml: string) {
  try {
    const lyricsDir = getLyricsPath()
    if (!existsSync(lyricsDir)) {
      await mkdir(lyricsDir, { recursive: true })
    }

    // 保存原始 TTML 文件
    const ttmlPath = join(lyricsDir, `${trackId}.ttml`)
    await writeFile(ttmlPath, ttml, 'utf-8')
    console.log(`[lyrics] Saved TTML for ${trackId}`)

    // 保存转换后的 LRC 文件
    const lrc = ttmlToLrc(ttml)
    const lrcPath = join(lyricsDir, `${trackId}.lrc`)
    await writeFile(lrcPath, lrc, 'utf-8')
    console.log(`[lyrics] Saved LRC for ${trackId}`)
  } catch (error) {
    console.error('[lyrics] Failed to save TTML and LRC:', error)
  }
}

interface NeteaseLrcResult {
  lrc: string
  tlyric?: string
}

// ===== 网易云 获取原始 LRC =====
async function fetchNeteaseLrc(neteaseId: number): Promise<NeteaseLrcResult | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://music.163.com/',
  }
  try {
    const res = await fetch(`https://music.163.com/api/song/lyric?id=${neteaseId}&lv=1&kv=1&tv=-1`, { headers })
    const data = await res.json()
    const lrc = (data?.lrc?.lyric as string) || null
    const tlyric = (data?.tlyric?.lyric as string) || null
    if (!lrc) return null
    return { lrc, tlyric: tlyric || undefined }
  } catch {
    return null
  }
}

// ===== 后台 TTML 升级 =====
async function upgradeToTtml(trackId: string, title: string, artist: string) {
  const neteaseId = await searchNeteaseId(title, artist)
  if (!neteaseId) return
  
  const ttml = await fetchAmllTtml(neteaseId)
  if (ttml) {
    await saveTtmlAndLrc(trackId, ttml)
    console.log(`[lyrics] Upgraded to TTML for ${trackId}`)
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
    // 优先读取 TTML 格式
    const ttmlPath = join(getLyricsPath(), `${trackId}.ttml`)
    const lrcPath = join(getLyricsPath(), `${trackId}.lrc`)
    
    if (existsSync(ttmlPath)) {
      try {
        const ttml = await readFile(ttmlPath, 'utf-8')
        return { success: true, source: 'local', format: 'ttml', raw: ttml, trackId }
      } catch (e) {
        console.warn('[lyrics] Failed to read local TTML:', e)
      }
    }
    
    // 本地只有 LRC 时，先返回 LRC，同时后台尝试获取 TTML 升级
    if (existsSync(lrcPath)) {
      try {
        const lrc = await readFile(lrcPath, 'utf-8')
        // 后台尝试获取 TTML 升级（不阻塞当前请求）
        if (title) {
          upgradeToTtml(trackId, title, artist).catch(e => {
            console.warn('[lyrics] Background TTML upgrade failed:', e)
          })
        }
        return { success: true, source: 'local', format: 'lrc', raw: lrc, trackId }
      } catch (e) {
        console.warn('[lyrics] Failed to read local LRC:', e)
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

  // 3. 获取 TTML 格式歌词
  const ttml = await fetchAmllTtml(neteaseId)
  if (ttml) {
    // 同时保存 TTML 和 LRC 到本地
    if (trackId) {
      await saveTtmlAndLrc(trackId, ttml)
    }
    return { success: true, source: 'amll-ttml', format: 'ttml', raw: ttml, neteaseId }
  }

  // 4. 获取 LRC 格式歌词
  const lrcResult = await fetchNeteaseLrc(neteaseId)
  if (lrcResult) {
    // 保存 LRC 到本地
    if (trackId) {
      try {
        const lyricsDir = getLyricsPath()
        if (!existsSync(lyricsDir)) {
          await mkdir(lyricsDir, { recursive: true })
        }
        const lrcPath = join(lyricsDir, `${trackId}.lrc`)
        await writeFile(lrcPath, lrcResult.lrc, 'utf-8')
        console.log(`[lyrics] Saved LRC for ${trackId}`)
      } catch (e) {
        console.warn('[lyrics] Failed to save LRC:', e)
      }
    }
    return { 
      success: true, 
      source: 'netease-lrc', 
      format: 'lrc', 
      raw: lrcResult.lrc, 
      tlyric: lrcResult.tlyric,
      neteaseId 
    }
  }

  return { success: false, source: 'none' }
})
