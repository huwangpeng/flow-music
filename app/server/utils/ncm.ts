/**
 * Netease Cloud Music (NCM) API Service
 * Server-side wrapper for NCM API calls with error handling
 */

import ncmApi from '@neteasecloudmusicapienhanced/api'
import { createError } from 'h3'

// CommonJS 模块的命名导出获取
const search = (ncmApi as any).search || (ncmApi as any).default?.search
const getSongDetail = (ncmApi as any).getSongDetail || (ncmApi as any).default?.getSongDetail
const getLyric = (ncmApi as any).getLyric || (ncmApi as any).default?.getLyric

export interface NCMTrackInfo {
  id: number
  title: string
  artist: string
  album: string
  year: number
  genre: string
  coverUrl: string
  duration: number
  lyrics: string | null
}

export interface NCMSearchResult {
  id: string
  title: string
  artist: string
  album?: string
  coverUrl?: string
  duration?: number
}

/**
 * Search songs on NCM by keyword
 */
export async function ncmSearch(keyword: string, limit: number = 20): Promise<NCMSearchResult[]> {
  try {
    const result = await search({ keyword, limit, type: 1 }) // type 1 = song

    if (!result.result?.songs || result.result.songs.length === 0) {
      return []
    }

    return result.result.songs.map((song: any) => ({
      id: String(song.id),
      title: song.name || '未知标题',
      artist: song.artists?.map((a: any) => a.name).join(', ') || '未知艺术家',
      album: song.album?.name || undefined,
      coverUrl: song.album?.picUrl || undefined,
      duration: song.duration ? Math.round(song.duration / 1000) : undefined
    }))
  } catch (error: any) {
    console.error('NCM搜索失败:', error.message || error)

    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: '请求过于频繁，请稍后再试'
      })
    }

    throw createError({
      statusCode: 502,
      message: `NCM搜索失败: ${error.message || '未知错误'}`
    })
  }
}

/**
 * Get detailed song information from NCM by song ID
 */
export async function ncmGetSongDetail(songId: number): Promise<NCMTrackInfo | null> {
  try {
    const result = await getSongDetail({ id: songId })

    if (!result.songs || result.songs.length === 0) {
      return null
    }

    const song = result.songs[0]

    return {
      id: song.id,
      title: song.name || '未知标题',
      artist: song.artists?.map((a: any) => a.name).join(', ') || '未知艺术家',
      album: song.album?.name || '未知专辑',
      year: song.album?.publishTime ? new Date(song.album.publishTime).getFullYear() : new Date().getFullYear(),
      genre: song.album?.company || '未知类型',
      coverUrl: song.album?.picUrl || '',
      duration: song.duration ? Math.round(song.duration / 1000) : 0,
      lyrics: null
    }
  } catch (error: any) {
    console.error('NCM获取歌曲详情失败:', error.message || error)
    return null
  }
}

/**
 * Get lyrics for a song from NCM
 */
export async function ncmGetLyric(songId: number): Promise<string | null> {
  try {
    const result = await getLyric({ id: songId })

    if (!result.lrc?.lyric) {
      return null
    }

    return result.lrc.lyric
  } catch (error: any) {
    console.error('NCM获取歌词失败:', error.message || error)
    return null
  }
}

/**
 * Search and get complete metadata for a song
 */
export async function ncmSearchWithMetadata(
  title: string,
  artist: string,
  duration?: number
): Promise<NCMTrackInfo | null> {
  try {
    // Search for the song
    const searchResults = await ncmSearch(`${title} ${artist}`, 5)

    if (searchResults.length === 0) {
      return null
    }

    // Find best match based on title and artist similarity
    let bestMatch = searchResults[0]
    let highestScore = 0

    for (const result of searchResults) {
      const titleMatch = result.title.toLowerCase().includes(title.toLowerCase())
      const artistMatch = result.artist.toLowerCase().includes(artist.toLowerCase())

      let score = 0
      if (titleMatch) score += 50
      if (artistMatch) score += 30
      if (result.duration && duration) {
        // Duration should be within 10 seconds tolerance
        const durationDiff = Math.abs(result.duration - duration)
        if (durationDiff < 10) {
          score += 20 - Math.min(durationDiff, 20)
        }
      }

      if (score > highestScore) {
        highestScore = score
        bestMatch = result
      }
    }

    // Get detailed info including cover
    const songId = parseInt(bestMatch.id)
    const detail = await ncmGetSongDetail(songId)

    if (detail) {
      // Try to get lyrics
      const lyrics = await ncmGetLyric(songId)
      return {
        ...detail,
        lyrics
      }
    }

    return null
  } catch (error: any) {
    console.error('NCM元数据搜索失败:', error.message || error)
    return null
  }
}