export interface PlaylistSummary {
  id: string
  source: string
  sourceId: string
  name: string
  description?: string | null
  coverUrl?: string | null
  ownerName?: string | null
  trackCount: number
  syncEnabled: boolean
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PlaylistTrackItem {
  id: string
  playlistId: string
  trackUuid?: string | null
  sourceTrackId: string
  name: string
  artist: string
  album?: string | null
  coverUrl?: string | null
  duration?: number | null
  position: number
  addedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PlaylistDetail extends PlaylistSummary {
  items: PlaylistTrackItem[]
}

export interface CreatePlaylistInput {
  name: string
  description?: string
  coverUrl?: string
}

export interface NcmPlaylistOwner {
  id: string
  nickname: string
  avatarUrl?: string
}

export interface NcmPlaylistTrack {
  id: string
  name: string
  artist: string
  album?: string
  duration?: number
  coverUrl?: string
}

export interface NcmPlaylistPayload {
  id: string
  name: string
  description?: string
  coverUrl?: string
  trackCount: number
  owner?: NcmPlaylistOwner
  tracks: NcmPlaylistTrack[]
}
