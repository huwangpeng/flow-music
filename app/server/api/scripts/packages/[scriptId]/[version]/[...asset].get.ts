import { existsSync, createReadStream } from 'fs'
import { normalize } from 'path'
import { createError, defineEventHandler, sendStream } from 'h3'
import { getScriptPackageVersionPath } from '~/server/utils/script-package-paths'

export default defineEventHandler(async (event) => {
  const scriptId = event.context.params?.scriptId || ''
  const version = event.context.params?.version || ''
  const asset = event.context.params?.asset || ''

  const basePath = getScriptPackageVersionPath(scriptId, version)
  const filePath = normalize(`${basePath}/${asset}`)

  if (!filePath.startsWith(normalize(basePath))) {
    throw createError({ statusCode: 403, message: '非法资源路径' })
  }

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, message: '插件资源不存在' })
  }

  return sendStream(event, createReadStream(filePath))
})
