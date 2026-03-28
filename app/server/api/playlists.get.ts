import { defineEventHandler } from 'h3'
import { listPlaylists } from '~/server/utils/playlist'

export default defineEventHandler(async () => {
  return await listPlaylists()
})
