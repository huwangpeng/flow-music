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
import { ncmSearchWithMetadata } from '~/server/utils/ncm'

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
    const extension = (filename.split('.').pop() || 'mp3').toLowerCase()
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

    if (extension === 'ncm') {
      try {
        const matched = await ncmSearchWithMetadata(finalTitle, finalArtist, tags.duration)
        if (matched) {
          finalTitle = matched.title || finalTitle
          finalArtist = matched.artist || finalArtist
          finalAlbum = matched.album || finalAlbum
          coverUrl = matched.coverUrl || coverUrl

          if (matched.lyrics) {
            await saveLyricsLocally(trackId, matched.lyrics)
          }
        }
      } catch (error: any) {
        console.warn('[Upload] NCM metadata matching failed:', error.message || error)
      }
    }

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

        // 使用 Meting API 搜索
        const neteaseRes = await fetch(
          `https://api.qijieya.cn/meting/?type=search&id=${keyword}`,
          { headers: fetchHeaders }
        ).then(r => r.json())
        
        if (neteaseRes?.length > 0) {
          const song = neteaseRes[0]
          finalTitle = song.name || finalTitle
          finalArtist = song.artist || finalArtist
          
          // 封面 URL 直接使用 meting API 返回的 pic
          if (song.pic) {
            coverUrl = song.pic
          }

          // 自动下载歌词（双语，从 meting API 获取）
          try {
            if (song.lrc) {
              const lrcRes = await fetch(song.lrc, { headers: fetchHeaders }).then(r => r.text())
              if (lrcRes) {
                await saveLyricsLocally(trackId, lrcRes)
              }
            }
          } catch (e) {
            console.warn('[Upload] Failed to fetch lyrics:', e)
          }
        } else {
          console.warn('[Upload] No search results from Meting API for:', keyword)
        }
      }
    } catch(err: any) {
      console.warn('Meting API fetching failed:', err.message)
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
               const response = await fetch(coverUrl, {
                 headers: { 'User-Agent': 'Mozilla/5.0' }
               })
               
               // 验证响应状态
               if (!response.ok) {
                 console.warn(`Cover download failed with status ${response.status} for ${filename}`)
               } else {
                 const contentType = response.headers.get('content-type')
                 // 验证返回的是图片数据
                 if (!contentType || !contentType.startsWith('image/')) {
                   console.warn(`Invalid content type for cover: ${contentType}`)
                 } else {
                   const buf = await response.arrayBuffer()
                   coverData = Buffer.from(buf)
                   
                   // 验证图片数据不为空且大小合理
                   if (coverData.length < 100) {
                     console.warn(`Cover data too small for ${filename}, likely an error response`)
                     coverData = undefined
                   }
                 }
               }
            } catch(e) {
              console.warn(`Failed to download cover for ${filename}:`, e)
            }
        }

        if (coverData) {
            coverArtId = crypto.createHash('md5').update(coverData).digest('hex')
            
            // 检查封面是否已经存在，避免重复写入
            const coverPath = join(coverDir, `${coverArtId}.jpg`)
            if (!existsSync(coverPath)) {
              await writeFile(coverPath, coverData)
            }
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
