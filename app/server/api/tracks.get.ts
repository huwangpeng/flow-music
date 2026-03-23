import { defineEventHandler } from 'h3'
import { prisma } from '~/server/utils/prisma'
import type { AudioTrack } from '~/types/audio'

export default defineEventHandler(async (event) => {
  try {
    const tracks = await prisma.audioTrack.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedTracks: AudioTrack[] = tracks.map(track => ({
      id: track.uuid,
      uuid: track.uuid,
      title: track.title,
      artist: track.artist,
      album: track.album,
      albumArtist: track.albumArtist,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      genre: track.genre,
      duration: track.duration,
      bitrate: track.bitrate,
      sampleRate: track.sampleRate,
      channels: track.channels,
      format: track.format,
      filePath: track.filePath,
      fileSize: track.fileSize,
      coverArtId: track.coverArtId,
      coverUrl: track.coverArtId ? `/api/cover/${track.coverArtId}` : null,
      lyrics: track.lyrics ? JSON.parse(track.lyrics) : null,
      userId: track.userId,
      tags: track.tags ? JSON.parse(track.tags) : {},
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString()
    }))

    return formattedTracks
  } catch (error) {
    console.error('加载音乐失败:', error)
    return []
  }
})