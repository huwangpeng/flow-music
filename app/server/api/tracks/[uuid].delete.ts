import { defineEventHandler, createError } from 'h3'
import { join } from 'path'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { prisma } from '~/server/utils/prisma'
import { getMusicPath, getCoverPath } from '~/server/utils/paths'

export default defineEventHandler(async (event) => {
  try {
    const uuid = event.context.params?.uuid

    if (!uuid) {
      throw createError({
        statusCode: 400,
        message: '缺少曲目ID'
      })
    }

    const track = await prisma.audioTrack.findFirst({
      where: { uuid }
    })

    if (!track) {
      throw createError({
        statusCode: 404,
        message: '曲目不存在'
      })
    }

    await prisma.audioTrack.delete({
      where: { uuid }
    })

    const musicPath = getMusicPath()
    const filePath = join(musicPath, `${uuid}.${track.format}`)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }

    if (track.coverArtId) {
      const coverPath = join(getCoverPath(), `${track.coverArtId}.jpg`)
      if (existsSync(coverPath)) {
        await unlink(coverPath)
      }
    }

    return { success: true, message: '删除成功' }
  } catch (error: any) {
    console.error('删除音乐失败:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '删除音乐失败'
    })
  }
})