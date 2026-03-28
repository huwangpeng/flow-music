import { createError, defineEventHandler, readBody } from 'h3'
import {
  appendScriptLog,
  ensureScriptPermission,
  getScriptActions
} from '~/server/utils/script-registry'
import type { ScriptActionRequest, ScriptActionResponse, ScriptPermission } from '~/types/scripts'
import {
  isScriptHostActionName,
  SCRIPT_HOST_ACTION_PERMISSIONS,
  type ScriptHostActionName
} from '~/types/script-host-actions'
import { scriptHostActionHandlers } from '~/server/utils/script-host-actions'

function getPermissions(payload?: Record<string, any>) {
  return Array.isArray(payload?.permissions) ? payload?.permissions as ScriptPermission[] : []
}

export default defineEventHandler(async (event): Promise<ScriptActionResponse> => {
  const body = await readBody<ScriptActionRequest>(event)

  if (!body?.scriptId || !body?.action) {
    throw createError({ statusCode: 400, message: '缺少脚本标识或动作标识' })
  }

  const permissions = getPermissions(body.payload)

  try {
    if (!isScriptHostActionName(body.action)) {
      throw new Error(`未知脚本动作：${body.action}`)
    }

    const actionName = body.action as ScriptHostActionName
    const requiredPermission = SCRIPT_HOST_ACTION_PERMISSIONS[actionName]
    ensureScriptPermission(permissions, requiredPermission)

    const start = Date.now()
    const handler = scriptHostActionHandlers[actionName]
    const data = await handler(body.scriptId, (body.payload || {}) as never)
    const durationMs = Date.now() - start

    const log = appendScriptLog({
      scriptId: body.scriptId,
      action: actionName,
      status: 'success',
      level: 'info',
      message: '执行成功',
      detail: JSON.stringify(body.payload || {}),
      requestId: body.meta?.requestId,
      durationMs
    })

    return {
      success: true,
      action: actionName,
      data,
      logs: [log]
    }
  } catch (error: any) {
    const log = appendScriptLog({
      scriptId: body.scriptId,
      action: body.action,
      status: 'failed',
      level: 'error',
      message: error.message || '执行失败',
      detail: JSON.stringify(body.payload || {}),
      requestId: body.meta?.requestId
    })

    return {
      success: false,
      action: body.action,
      error: error.message || '执行失败',
      logs: [log]
    }
  }
})
