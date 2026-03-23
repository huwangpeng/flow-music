export interface AudioTags {
  [key: string]: string | number | boolean | null
}

export interface LyricLine {
  time: number  // 秒
  text: string
}

export interface AudioTrack {
  id: string
  uuid?: string
  title: string
  artist: string
  album?: string | null
  albumArtist?: string | null
  trackNumber?: number | null
  discNumber?: number | null
  year?: number | null
  genre?: string | null
  duration: number
  bitrate?: number | null
  sampleRate?: number | null
  channels?: number | null
  format: string
  filePath: string
  fileSize: number
  fileExtension?: string
  coverArtId?: string | null
  coverUrl?: string | null
  coverArt?: string | null
  lyrics?: LyricLine[] | string | null
  userId?: string
  tags?: AudioTags
  createdAt: string
  updatedAt: string
}

export interface UploadResponse {
  success: boolean
  data?: AudioTrack
  error?: {
    code: string
    message: string
  }
}

export interface LibraryFilters {
  search?: string
  artist?: string
  album?: string
  genre?: string
  year?: number
}

export interface LibraryState {
  tracks: AudioTrack[]
  filters: LibraryFilters
  isLoading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
}
