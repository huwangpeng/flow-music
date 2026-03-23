import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { saveLyricsLocally } from '~/server/utils/lyrics'
import type { AudioTrack } from '~/types/audio'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<Partial<AudioTrack>>(event)

    if (!body.uuid) {
      throw createError({
        statusCode: 400,
        message: '缺少音乐UUID'
      })
    }

    // 下载并保存歌词到本地文件系统
    if (body.lyrics) {
      // 这里的 lyrics 可能是 JSON 字符串，也可能是对象数组
      await saveLyricsLocally(body.uuid, body.lyrics)
    }

    const data: any = {
      title: body.title,
      artist: body.artist,
      album: body.album,
      albumArtist: body.albumArtist,
      trackNumber: body.trackNumber,
      discNumber: body.discNumber,
      year: body.year,
      genre: body.genre,
      duration: body.duration,
      bitrate: body.bitrate,
      sampleRate: body.sampleRate,
      channels: body.channels,
      format: body.format,
      filePath: body.filePath,
      fileSize: body.fileSize,
      coverArtId: body.coverArtId,
      lyrics: body.lyrics ? (typeof body.lyrics === 'string' ? body.lyrics : JSON.stringify(body.lyrics)) : undefined,
      userId: body.userId || 'default',
      tags: body.tags ? (typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)) : undefined
    }

    // 清除 undefined 属性
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key])

    // 使用 upsert 确保更新
    const track = await prisma.audioTrack.upsert({
      where: { uuid: body.uuid },
      update: data,
      create: {
        uuid: body.uuid,
        title: body.title || '未知标题',
        artist: body.artist || '未知艺术家',
        format: body.format || 'mp3',
        filePath: body.filePath || '',
        fileSize: body.fileSize || 0,
        ...data
      }
    })

    // 映射并转换 Date 格式以便前端兼容
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
      lyrics: track.lyrics,
      userId: track.userId,
      tags: track.tags ? JSON.parse(track.tags) : {},
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString()
    }

    return response
  } catch (error: any) {
    console.error('保存/更新音乐失败:', error)
    throw createError({
      statusCode: 500,
      message: error.message || '保存/更新音乐失败'
    })
  }
})