import { randomUUID } from 'crypto'
import { prisma } from '~/server/utils/prisma'
import type { CreatePlaylistInput, NcmPlaylistPayload, PlaylistDetail, PlaylistSummary } from '~/types/playlist'

function mapPlaylist(playlist: any): PlaylistSummary {
  return {
    id: playlist.id,
    source: playlist.source,
    sourceId: playlist.sourceId,
    name: playlist.name,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    ownerName: playlist.ownerName,
    trackCount: playlist.trackCount,
    syncEnabled: playlist.syncEnabled,
    lastSyncedAt: playlist.lastSyncedAt?.toISOString() || null,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString()
  }
}

export async function listPlaylists(): Promise<PlaylistSummary[]> {
  const playlists = await prisma.playlist.findMany({
    orderBy: { updatedAt: 'desc' }
  })
  return playlists.map(mapPlaylist)
}

export async function getPlaylistDetail(id: string): Promise<PlaylistDetail | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: 'asc' }
      }
    }
  })

  if (!playlist) return null

  return {
    ...mapPlaylist(playlist),
    items: playlist.items.map(item => ({
      id: item.id,
      playlistId: item.playlistId,
      trackUuid: item.trackUuid,
      sourceTrackId: item.sourceTrackId,
      name: item.name,
      artist: item.artist,
      album: item.album,
      coverUrl: item.coverUrl,
      duration: item.duration,
      position: item.position,
      addedAt: item.addedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }))
  }
}

export async function upsertNcmPlaylist(payload: NcmPlaylistPayload) {
  const playlist = await prisma.playlist.upsert({
    where: {
      source_sourceId: {
        source: 'ncm',
        sourceId: payload.id
      }
    },
    update: {
      name: payload.name,
      description: payload.description,
      coverUrl: payload.coverUrl,
      ownerName: payload.owner?.nickname,
      trackCount: payload.trackCount,
      syncEnabled: true,
      lastSyncedAt: new Date()
    },
    create: {
      source: 'ncm',
      sourceId: payload.id,
      name: payload.name,
      description: payload.description,
      coverUrl: payload.coverUrl,
      ownerName: payload.owner?.nickname,
      trackCount: payload.trackCount,
      syncEnabled: true,
      lastSyncedAt: new Date()
    }
  })

  await prisma.playlistTrack.deleteMany({
    where: { playlistId: playlist.id }
  })

  if (payload.tracks.length > 0) {
    await prisma.playlistTrack.createMany({
      data: payload.tracks.map((track, index) => ({
        playlistId: playlist.id,
        sourceTrackId: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        coverUrl: track.coverUrl,
        duration: track.duration,
        position: index
      }))
    })
  }

  return playlist
}

export async function createLocalPlaylist(input: CreatePlaylistInput) {
  const playlist = await prisma.playlist.create({
    data: {
      source: 'local',
      sourceId: randomUUID(),
      name: input.name,
      description: input.description,
      coverUrl: input.coverUrl,
      syncEnabled: false,
      trackCount: 0
    }
  })

  return mapPlaylist(playlist)
}
