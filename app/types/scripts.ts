export type ScriptPermission =
  | 'storage:read'
  | 'storage:write'
  | 'network:fetch'
  | 'library:read'
  | 'library:write'
  | 'library:delete'
  | 'files:read'
  | 'files:write'
  | 'files:transcode'
  | 'downloads:manage'
  | 'automation:flow'
  | 'ui:config'
  | 'ui:page'
  | 'runtime:execute'

export type ScriptSourceType = 'local' | 'url' | 'npm' | 'store' | 'inline' | 'package'

export type ScriptFieldType = 'text' | 'textarea' | 'boolean' | 'number' | 'select' | 'password'

export interface ScriptConfigField {
  key: string
  label: string
  type: ScriptFieldType
  default?: string | number | boolean
  options?: string[]
  placeholder?: string
  required?: boolean
  secret?: boolean
  description?: string
}

export interface ScriptConfigPage {
  title: string
  description?: string
  fields: ScriptConfigField[]
}

export interface ScriptActionDefinition {
  id: string
  label: string
  description?: string
  permission: ScriptPermission
}

export interface ScriptFlowNodeDefinition {
  id: string
  label: string
  kind: 'trigger' | 'action'
  description?: string
}

export interface ScriptPageDefinition {
  id: string
  title: string
  path: string
  entry: string
  icon?: string
  description?: string
  visibleInSidebar?: boolean
}

export interface ScriptManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  source: string
  sourceType: ScriptSourceType
  permissions: ScriptPermission[]
  configPage?: ScriptConfigPage
  pages?: ScriptPageDefinition[]
  actions?: ScriptActionDefinition[]
  flowNodes?: ScriptFlowNodeDefinition[]
}

export interface ScriptDefinition extends ScriptManifest {
  code: string
  enabled: boolean
  settings: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ScriptExecutionLog {
  id: string
  scriptId: string
  action: string
  status: 'success' | 'failed'
  level?: 'debug' | 'info' | 'warn' | 'error'
  message: string
  detail?: string
  requestId?: string
  durationMs?: number
  createdAt: string
}

export interface ScriptActionRequest {
  scriptId: string
  action: string
  payload?: Record<string, any>
  meta?: {
    requestId?: string
    source?: 'script-runtime' | 'flow-node' | 'manual'
    timeoutMs?: number
  }
}

export interface ScriptActionResponse {
  success: boolean
  data?: any
  error?: string
  logs?: ScriptExecutionLog[]
}
