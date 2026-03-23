import { defineEventHandler, createError, getRouterParam, setHeader } from 'h3'
import { join } from 'path'
import { readFile, access } from 'fs/promises'
import { getCoverPath } from '~/server/utils/paths'

// GET /api/cover/[coverId]
export default defineEventHandler(async (event) => {
  const coverId = getRouterParam(event, 'coverId')

  if (!coverId) {
    throw createError({ statusCode: 400, message: '缺少封面ID' })
  }

  // 仅允许 md5 hex 字符 防止路径穿越 
  if (!/^[a-f0-9]{32}$/.test(coverId)) {
    throw createError({ statusCode: 400, message: '无效的封面ID' })
  }

  const coverDir = getCoverPath()
  // 尝试常见图片格式
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const filePath = join(coverDir, `${coverId}.${ext}`)
    try {
      await access(filePath)
      const data = await readFile(filePath)
      setHeader(event, 'Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`)
      setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
      return data
    } catch {
      // 尝试下一个扩展名
    }
  }

  throw createError({ statusCode: 404, message: '封面不存在' })
})
