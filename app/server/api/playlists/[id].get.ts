import { createError, defineEventHandler } from 'h3'
import { getPlaylistDetail } from '~/server/utils/playlist'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少歌单标识' })
  }

  const playlist = await getPlaylistDetail(id)
  if (!playlist) {
    throw createError({ statusCode: 404, message: '歌单不存在' })
  }

  return playlist
})
