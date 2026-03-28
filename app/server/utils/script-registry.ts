import type {
  ScriptActionDefinition,
  ScriptExecutionLog,
  ScriptFlowNodeDefinition,
  ScriptPageDefinition,
  ScriptPermission
} from '~/types/scripts'

export const SCRIPT_PERMISSION_LABELS: Record<ScriptPermission, string> = {
  'storage:read': '读取脚本存储',
  'storage:write': '写入脚本存储',
  'network:fetch': '访问外部网络',
  'library:read': '读取音乐库',
  'library:write': '写入音乐库',
  'library:delete': '删除音乐库资源',
  'files:read': '读取文件',
  'files:write': '写入文件',
  'files:transcode': '执行转码',
  'downloads:manage': '管理下载任务',
  'automation:flow': '注册流程节点',
  'ui:config': '提供配置页面',
  'ui:page': '提供自定义页面',
  'runtime:execute': '执行脚本运行时'
}

export const DEFAULT_SCRIPT_PERMISSIONS: ScriptPermission[] = [
  'runtime:execute',
  'ui:config'
]

const scriptActionRegistry = new Map<string, ScriptActionDefinition[]>()
const scriptFlowRegistry = new Map<string, ScriptFlowNodeDefinition[]>()
const scriptPageRegistry = new Map<string, ScriptPageDefinition[]>()
const scriptExecutionLogs: ScriptExecutionLog[] = []

export function registerScriptActions(scriptId: string, actions: ScriptActionDefinition[]) {
  scriptActionRegistry.set(scriptId, actions)
}

export function registerScriptFlowNodes(scriptId: string, nodes: ScriptFlowNodeDefinition[]) {
  scriptFlowRegistry.set(scriptId, nodes)
}

export function registerScriptPages(scriptId: string, pages: ScriptPageDefinition[]) {
  scriptPageRegistry.set(scriptId, pages)
}

export function getScriptActions(scriptId?: string) {
  if (scriptId) return scriptActionRegistry.get(scriptId) || []
  return Array.from(scriptActionRegistry.entries()).flatMap(([owner, actions]) =>
    actions.map(action => ({ ...action, owner }))
  )
}

export function getScriptFlowNodes(scriptId?: string) {
  if (scriptId) return scriptFlowRegistry.get(scriptId) || []
  return Array.from(scriptFlowRegistry.entries()).flatMap(([owner, nodes]) =>
    nodes.map(node => ({ ...node, owner }))
  )
}

export function getScriptPages(scriptId?: string) {
  if (scriptId) return scriptPageRegistry.get(scriptId) || []
  return Array.from(scriptPageRegistry.entries()).flatMap(([owner, pages]) =>
    pages.map(page => ({ ...page, owner }))
  )
}

export function appendScriptLog(log: Omit<ScriptExecutionLog, 'id' | 'createdAt'>) {
  const entry: ScriptExecutionLog = {
    id: `script-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...log
  }

  scriptExecutionLogs.unshift(entry)

  if (scriptExecutionLogs.length > 200) {
    scriptExecutionLogs.length = 200
  }

  return entry
}

export function listScriptLogs(scriptId?: string) {
  return scriptId
    ? scriptExecutionLogs.filter(log => log.scriptId === scriptId)
    : scriptExecutionLogs
}

export function ensureScriptPermission(granted: ScriptPermission[], required: ScriptPermission) {
  if (!granted.includes(required)) {
    throw new Error(`脚本缺少权限：${SCRIPT_PERMISSION_LABELS[required]}`)
  }
}
