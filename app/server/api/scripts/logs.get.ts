import { defineEventHandler, getQuery } from 'h3'
import { listScriptLogs } from '~/server/utils/script-registry'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const scriptId = typeof query.scriptId === 'string' ? query.scriptId : undefined
  return listScriptLogs(scriptId)
})
