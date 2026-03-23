import * as mm from 'music-metadata'

export interface ParsedTags {
  title: string
  artist: string
  album?: string
  albumArtist?: string
  trackNumber?: number
  discNumber?: number
  year?: number
  genre?: string
  duration?: number
  bitrate?: number
  sampleRate?: number
  channels?: number
  coverArt?: Buffer
}

export async function parseAudioMetadata(buffer: Buffer, filename: string): Promise<ParsedTags> {
  try {
    const metadata = await mm.parseBuffer(buffer, filename)

    const common = metadata.common
    const format = metadata.format

    return {
      title: common.title || filename.replace(/\.[^/.]+$/, ''),
      artist: common.artist || '未知艺术家',
      album: common.album,
      albumArtist: common.albumartist,
      trackNumber: common.track?.no ?? undefined,
      discNumber: common.disk?.no ?? undefined,
      year: common.year,
      genre: common.genre?.[0],
      duration: format.duration ? Math.floor(format.duration) : 0,
      bitrate: format.bitrate ? Math.floor(format.bitrate / 1000) : undefined,
      sampleRate: format.sampleRate,
      channels: format.numberOfChannels,
      coverArt: common.picture?.[0]?.data ? Buffer.from(common.picture[0].data) : undefined
    }
  } catch (error) {
    console.error('Failed to parse audio metadata:', error)
    return parseFilename(filename)
  }
}

export function parseFilename(filename: string): ParsedTags {
  let nameWithoutExt = filename.replace(/\.[^/.]+$/, '')

  // 清理常见的杂项前后缀，如 [FLAC], (320kbps), 【官方版】等
  // 必须只清理独立的括号内容，不破坏真正带括号的歌名
  const junkPatterns = [
    /\[(?:FLAC|MP3|WAV|320K|SQ|HQ|无损|官方|MV|现场)\]/ig,
    /\((?:FLAC|MP3|WAV|320K|SQ|HQ|无损|官方|MV|现场)\)/ig,
    /【(?:FLAC|MP3|WAV|320K|SQ|HQ|无损|官方|MV|现场)】/ig,
  ];
  
  for (const regex of junkPatterns) {
    nameWithoutExt = nameWithoutExt.replace(regex, '');
  }
  nameWithoutExt = nameWithoutExt.trim();

  const patterns = [
    {
      name: '数字. 艺术家 - 歌曲名',
      regex: /^\d+[\.\s_-]+\s*(.+?)\s*[-–—]\s*(.+?)(?:\s*[\(\[].*[\)\]])?$/i,
      parse: (matches: RegExpMatchArray): ParsedTags => ({
        title: matches[2]?.trim() || '',
        artist: matches[1]?.trim() || ''
      })
    },
    {
      name: '艺术家 - 专辑 - 歌曲名',
      regex: /^(.+?)\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+?)$/i,
      parse: (matches: RegExpMatchArray): ParsedTags => ({
        title: matches[3]?.trim() || '',
        artist: matches[1]?.trim() || '',
        album: matches[2]?.trim() || ''
      })
    },
    {
      name: '艺术家 - 歌曲名',
      regex: /^(.+?)\s*[-–—]\s*(.+?)$/i,
      parse: (matches: RegExpMatchArray): ParsedTags => ({
        title: matches[2]?.trim() || '',
        artist: matches[1]?.trim() || ''
      })
    },
    {
      name: '歌曲名 - 艺术家 (带可能的前缀数字)',
      regex: /^(?:\d+[\.\s_-]+)?(.+?)\s*[-–—]\s*(.+?)$/i,
      parse: (matches: RegExpMatchArray): ParsedTags => ({
        title: matches[1]?.trim() || '',
        artist: matches[2]?.trim() || ''
      })
    }
  ]

  for (const pattern of patterns) {
    const matches = nameWithoutExt.match(pattern.regex)
    if (matches) {
      return pattern.parse(matches)
    }
  }

  // 兜底：如果完全没有分隔符，直接全当歌曲名
  return {
    title: nameWithoutExt,
    artist: '未知艺术家'
  }
}

export function extractTrackNumber(filename: string): number | undefined {
  const match = filename.match(/^(\d+)[\.\s_-]/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return undefined
}

export function extractYear(filename: string): number | undefined {
  const match = filename.match(/[\(\[](\d{4})[\)\]]/)
  if (match && match[1]) {
    const year = parseInt(match[1], 10)
    if (year >= 1900 && year <= 2100) {
      return year
    }
  }
  return undefined
}

export function parseAudioTags(filename: string): ParsedTags {
  const basicTags = parseFilename(filename)
  const trackNumber = extractTrackNumber(filename)
  const year = extractYear(filename)

  return {
    ...basicTags,
    trackNumber,
    year
  }
}