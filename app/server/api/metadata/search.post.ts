import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { ncmSearch } from '~/server/utils/ncm'
import type { AudioTrack } from '~/types/audio'

export interface SearchRequest {
  keyword: string
  limit?: number
}

export interface SearchResult {
  id: string
  title: string
  artist: string
  album?: string
  source: 'ncm' | 'local'
  coverUrl?: string
  duration?: number
}

export interface SearchResponse {
  success: boolean
  results: SearchResult[]
  total: number
  error?: string
}

/**
 * Multi-source metadata search API
 * Searches across NCM and local database
 */
export default defineEventHandler<SearchResponse>(async (event) => {
  try {
    const body = await readBody<SearchRequest>(event)

    if (!body.keyword || body.keyword.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: '搜索关键词不能为空'
      })
    }

    const keyword = body.keyword.trim()
    const limit = Math.min(body.limit || 20, 100)

    const results: SearchResult[] = []

    // 1. Search local database
    const localTracks = await prisma.audioTrack.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { artist: { contains: keyword } },
          { album: { contains: keyword } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    localTracks.forEach(track => {
      results.push({
        id: track.uuid,
        title: track.title,
        artist: track.artist,
        album: track.album || undefined,
        source: 'local',
        coverUrl: track.coverArtId ? `/api/cover/${track.coverArtId}` : undefined,
        duration: track.duration || undefined
      })
    })

    // 2. If local results are less than limit, search NCM
    if (results.length < limit) {
      try {
        const ncmResults = await ncmSearch(keyword, limit - results.length)
        results.push(...ncmResults)
      } catch (ncmError: any) {
        // NCM search failed, continue with local results
        console.warn('NCM搜索失败:', ncmError.message || ncmError)
      }
    }

    return {
      success: true,
      results: results.slice(0, limit),
      total: results.length
    }
  } catch (error: any) {
    console.error('搜索失败:', error.message || error)

    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: '请求过于频繁，请稍后再试'
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '搜索失败'
    })
  }
})