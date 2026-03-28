import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { installScriptPackageFromBuffer } from '~/server/utils/script-package-service'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const filePart = form?.find(item => item.name === 'file')

  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: '未上传插件包文件' })
  }

  if (!filePart.filename.endsWith('.zip') && !filePart.filename.endsWith('.flow-script.zip')) {
    throw createError({ statusCode: 400, message: '仅支持 zip 插件包' })
  }

  const result = await installScriptPackageFromBuffer(filePart.filename, filePart.data)

  return {
    success: true,
    data: result
  }
})
