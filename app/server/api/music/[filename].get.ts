import { defineEventHandler, getRouterParam, createError, getHeader, setHeader, setResponseStatus } from 'h3'
import { createReadStream, existsSync, statSync } from 'fs'
import { join } from 'path'
import { getMusicPath } from '~/server/utils/paths'

export default defineEventHandler(async (event) => {
  try {
    const filename = getRouterParam(event, 'filename')
    
    if (!filename) {
      throw createError({
        statusCode: 400,
        message: '文件名无效'
      })
    }

    const storagePath = getMusicPath()
    const filePath = join(storagePath, filename)
    
    if (!existsSync(filePath)) {
      throw createError({
        statusCode: 404,
        message: '文件不存在'
      })
    }

    const stat = statSync(filePath)
    const fileSize = stat.size
    const rangeHeader = getHeader(event, 'range')

    // 设置基本响应头
    setHeader(event, 'Accept-Ranges', 'bytes')
    const extension = filename.split('.').pop()?.toLowerCase()
    const contentType = extension === 'flac' ? 'audio/flac' : 
                        extension === 'mp3' ? 'audio/mpeg' : 
                        extension === 'wav' ? 'audio/wav' : 'audio/mpeg'
    setHeader(event, 'Content-Type', contentType)

    if (typeof rangeHeader === 'string') {
      const parts = rangeHeader.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0] || '0', 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      
      if (start >= fileSize) {
        setResponseStatus(event, 416)
        return 'Requested Range Not Satisfiable'
      }

      const chunksize = (end - start) + 1
      const stream = createReadStream(filePath, { start, end })

      setResponseStatus(event, 206)
      setHeader(event, 'Content-Range', `bytes ${start}-${end}/${fileSize}`)
      setHeader(event, 'Content-Length', chunksize)
      
      return stream
    } else {
      setHeader(event, 'Content-Length', fileSize)
      return createReadStream(filePath)
    }
  } catch (error: any) {
    console.error('读取音乐文件失败:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '读取文件失败'
    })
  }
})