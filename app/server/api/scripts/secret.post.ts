import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ scriptId?: string; key?: string; value?: string }>(event)

  if (!body.scriptId || !body.key || typeof body.value !== 'string') {
    throw createError({ statusCode: 400, message: '缺少脚本密钥参数' })
  }

  const secret = await prisma.scriptSecret.upsert({
    where: {
      scriptId_key: {
        scriptId: body.scriptId,
        key: body.key
      }
    },
    update: {
      value: body.value
    },
    create: {
      scriptId: body.scriptId,
      key: body.key,
      value: body.value
    }
  })

  return {
    success: true,
    id: secret.id
  }
})
