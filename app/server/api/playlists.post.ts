import { createError, defineEventHandler, readBody } from 'h3'
import { createLocalPlaylist } from '~/server/utils/playlist'
import type { CreatePlaylistInput } from '~/types/playlist'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreatePlaylistInput>(event)

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, message: '歌单名称不能为空' })
  }

  return await createLocalPlaylist({
    name: body.name.trim(),
    description: body.description?.trim(),
    coverUrl: body.coverUrl?.trim()
  })
})
