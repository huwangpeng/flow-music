import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { ncmSearchWithMetadata } from '~/server/utils/ncm'
import type { AudioTrack } from '~/types/audio'

export interface NCMTrack {
  id: string
  title: string
  artist: string
  album: string
  year: number
  genre: string
  coverUrl: string
  duration: number
  lyrics: string | null
}

export interface NCMSearchRequest {
  title: string
  artist: string
  duration?: number
}

export interface NCMSearchResponse {
  success: boolean
  data?: NCMTrack
  error?: string
  source: 'ncm' | 'local' | 'fallback'
}

/**
 * NCM (NetEase Cloud Music) metadata search API
 * Searches for matching songs and returns metadata
 */
export default defineEventHandler<NCMSearchResponse>(async (event) => {
  try {
    const body = await readBody<NCMSearchRequest>(event)

    if (!body.title || !body.artist) {
      throw createError({
        statusCode: 400,
        message: '缺少标题或艺术家信息'
      })
    }

    const { title, artist, duration } = body

    // Try to find exact match in local database first
    const localTrack = await prisma.audioTrack.findFirst({
      where: {
        AND: [
          { title: { contains: title } },
          { artist: { contains: artist } }
        ]
      }
    })

    // If found in local database with complete metadata, return it
    if (localTrack && localTrack.year && localTrack.genre) {
      return {
        success: true,
        source: 'local',
        data: {
          id: localTrack.uuid,
          title: localTrack.title,
          artist: localTrack.artist,
          album: localTrack.album || '未知专辑',
          year: localTrack.year,
          genre: localTrack.genre,
          coverUrl: localTrack.coverArtId ? `/api/cover/${localTrack.coverArtId}` : '',
          duration: localTrack.duration,
          lyrics: localTrack.lyrics
        }
      }
    }

    // Call NCM API to search for metadata
    const ncmTrack = await ncmSearchWithMetadata(title, artist, duration)

    if (ncmTrack) {
      return {
        success: true,
        source: 'ncm',
        data: {
          id: `ncm_${ncmTrack.id}`,
          title: ncmTrack.title,
          artist: ncmTrack.artist,
          album: ncmTrack.album,
          year: ncmTrack.year,
          genre: ncmTrack.genre,
          coverUrl: ncmTrack.coverUrl,
          duration: ncmTrack.duration,
          lyrics: ncmTrack.lyrics
        }
      }
    }

    // Fallback: return basic info without NCM data
    return {
      success: true,
      source: 'fallback',
      data: {
        id: `fallback_${Date.now()}`,
        title: title,
        artist: artist,
        album: '未知专辑',
        year: new Date().getFullYear(),
        genre: '未知类型',
        coverUrl: '',
        duration: duration || 0,
        lyrics: null
      }
    }
  } catch (error: any) {
    console.error('NCM搜索失败:', error.message || error)

    // Rate limiting check
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