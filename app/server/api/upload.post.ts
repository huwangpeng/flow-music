import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { prisma } from '~/server/utils/prisma'
import { getMusicPath, getCoverPath } from '~/server/utils/paths'
import type { AudioTrack } from '~/types/audio'
import { parseAudioMetadata } from '~/utils/parseTags'
import { generateTrackId } from '~/utils/fileHash'
import { saveLyricsLocally } from '~/server/utils/lyrics'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: '没有接收到文件'
      })
    }

    const fileData = formData.find(part => part.name === 'file')

    if (!fileData || !fileData.data) {
      throw createError({
        statusCode: 400,
        message: '没有找到文件数据'
      })
    }

    const filename = fileData.filename || 'unknown'
    const extension = filename.split('.').pop() || 'mp3'
    const fileSize = fileData.data.length
    const trackId = generateTrackId(filename, fileSize)
    const storageDir = getMusicPath()
    const filePath = join(storageDir, `${trackId}.${extension}`)

    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true })
    }

    const existingTrack = await prisma.audioTrack.findFirst({
      where: { uuid: trackId }
    })

    if (existingTrack) {
      const response: AudioTrack = {
        id: existingTrack.uuid,
        uuid: existingTrack.uuid,
        title: existingTrack.title,
        artist: existingTrack.artist,
        album: existingTrack.album,
        albumArtist: existingTrack.albumArtist,
        trackNumber: existingTrack.trackNumber,
        discNumber: existingTrack.discNumber,
        year: existingTrack.year,
        genre: existingTrack.genre,
        duration: existingTrack.duration,
        bitrate: existingTrack.bitrate,
        sampleRate: existingTrack.sampleRate,
        channels: existingTrack.channels,
        format: existingTrack.format,
        filePath: existingTrack.filePath,
        fileSize: existingTrack.fileSize,
        coverArtId: existingTrack.coverArtId,
        lyrics: null,
        userId: existingTrack.userId,
        tags: {},
        createdAt: existingTrack.createdAt.toISOString(),
        updatedAt: existingTrack.updatedAt.toISOString()
      }
      return response
    }

    const tags = await parseAudioMetadata(fileData.data, filename)

    // 确保保存真实的音频二进制文件到硬盘
    await writeFile(filePath, fileData.data)

    // 网易云音乐 API 补全逻辑
    // 优先从元数据解析标题，如果没有则剥离文件后缀作为标题
    let finalTitle = tags.title || filename.replace(/\.[^/.]+$/, "")
    // 用户要求：剔除带（原唱/伴奏）等杂质的匹配词（除非文件名本来就只有这些）
    const sanitizeTitleForSearch = (t: string) => t.replace(/(\(|（)原唱(\)|）)|(\(|（)伴奏(\)|）)/g, '').trim() || t
    
    let finalArtist = tags.artist || '未知艺术家'
    let finalAlbum = tags.album || '未知专辑'
    let coverUrl: string | null = null

    try {
      // 排除掉不合法的 title 
      if (finalTitle && finalTitle !== 'unknown' && finalTitle.trim().length > 0) {
        const cleanTitle = sanitizeTitleForSearch(finalTitle)
        const queryStr = `${cleanTitle} ${finalArtist === '\u672a\u77e5\u827a\u672f\u5bb6' ? '' : finalArtist}`.trim()
        const keyword = encodeURIComponent(queryStr)
        
        const fetchHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://music.163.com/'
        }

        // 使用无需认证的 web 搜索接口
        const neteaseRes = await fetch(
          `https://music.163.com/api/search/get/web?s=${keyword}&type=1&limit=1`,
          { headers: fetchHeaders }
        ).then(r => r.json())
        
        if (neteaseRes?.result?.songs?.length > 0) {
          const song = neteaseRes.result.songs[0]
          finalTitle = song.name
          finalArtist = song.artists?.map((a: any) => a.name).join(', ') || finalArtist
          finalAlbum = song.album?.name || finalAlbum
          
          // 网易云封面地址由 picId 构造，加了 param 压缩至 500x500，提升数十倍刮取速度
          const picId = song.album?.picId
          if (picId) {
            coverUrl = `https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==${picId}.jpg?param=500y500`
          }

          // 自动下载歌词
          try {
            const lrcRes = await fetch(`https://music.163.com/api/song/lyric?id=${song.id}&lv=1&kv=1&tv=-1`, { headers: fetchHeaders }).then(r => r.json())
            if (lrcRes?.lrc?.lyric) {
              await saveLyricsLocally(trackId, lrcRes.lrc.lyric)
            }
          } catch (e) {
            console.warn('[Upload] Failed to fetch lyrics:', e)
          }
        } else {
           // 补充 QQ 音乐搜索探测 fallback
           const qqRes = await fetch(`https://api.lolimi.cn/API/qqyy/?word=${keyword}&page=1`).then(r => r.json())
           if (qqRes?.code === 1 && qqRes.data?.length > 0) {
             const qqSong = qqRes.data[0]
             finalTitle = qqSong.songname || finalTitle
             finalArtist = qqSong.singer || finalArtist
             coverUrl = qqSong.pic || coverUrl
           }
        }
      }
    } catch(err: any) {
      console.warn('Netease API fetching failed, attempting fallback...', err.message)
      try {
        const cleanTitle = sanitizeTitleForSearch(finalTitle)
        const query = encodeURIComponent(cleanTitle)
        const fallbackRes = await fetch(`http://music.163.com/api/search/pc?s=${query}&limit=1&type=1`).then(r => r.json())
        if (fallbackRes?.result?.songs?.length > 0) {
          const song = fallbackRes.result.songs[0]
          finalTitle = song.name
          finalArtist = song.artists?.map((a: any) => a.name).join('/') || finalArtist
          finalAlbum = song.album?.name || finalAlbum
        }
      } catch (fallbackErr) {
        console.error('All Tag Completion API failed', fallbackErr)
      }
    }

    let coverArtId: string | null = null
    if (tags.coverArt || coverUrl) {
      const crypto = await import('crypto')
      const coverDir = getCoverPath()
      if (!existsSync(coverDir)) {
        await mkdir(coverDir, { recursive: true })
      }
      
      let coverData = tags.coverArt
      if (!coverData && coverUrl) {
          try {
             // 封面下载也带上 headers
             const buf = await fetch(coverUrl, {
               headers: { 'User-Agent': 'Mozilla/5.0' }
             }).then(r => r.arrayBuffer())
             coverData = Buffer.from(buf)
          } catch(e) {}
      }

      if (coverData) {
          coverArtId = crypto.createHash('md5').update(coverData).digest('hex')
          const coverPath = join(coverDir, `${coverArtId}.jpg`)
          await writeFile(coverPath, coverData)
      }
    }

    const track = await prisma.audioTrack.create({
      data: {
        uuid: trackId,
        title: finalTitle,
        artist: finalArtist,
        album: finalAlbum,
        albumArtist: tags.albumArtist,
        trackNumber: tags.trackNumber,
        discNumber: tags.discNumber,
        year: tags.year,
        genre: tags.genre,
        duration: tags.duration || 0,
        bitrate: tags.bitrate,
        sampleRate: tags.sampleRate,
        channels: tags.channels,
        format: extension,
        filePath: `/api/music/${trackId}.${extension}`,
        fileSize: fileSize,
        coverArtId: coverArtId,
        lyrics: null,
        userId: 'default',
        tags: '{}'
      }
    })

    const response: AudioTrack = {
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
      lyrics: null,
      userId: track.userId,
      tags: {},
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString()
    }

    return response
  } catch (error: any) {
    console.error('上传失败:', error.message || error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '上传失败'
    })
  }
})