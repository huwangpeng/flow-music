import type { AudioTrack } from '~/types/audio'
import type { ScriptExecutionLog, ScriptPermission } from '~/types/scripts'

export type ScriptHostActionName =
  | 'library.track.list'
  | 'library.track.upsert'
  | 'library.track.delete'
  | 'library.track.updateLyrics'
  | 'files.list'
  | 'files.writeText'
  | 'files.transcode'
  | 'download.create'
  | 'download.get'
  | 'download.list'
  | 'network.fetch'
  | 'scripts.describeActions'
  | 'logs.query'

export type ScriptDownloadTaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ScriptDownloadTask {
  id: string
  scriptId: string
  url: string
  targetPath: string
  status: ScriptDownloadTaskStatus
  error?: string
  createdAt: string
  updatedAt: string
}

export interface ScriptActionMeta {
  requestId?: string
  source?: 'script-runtime' | 'flow-node' | 'manual'
  timeoutMs?: number
}

export interface ScriptHostActionMap {
  'library.track.list': {
    payload: {
      keyword?: string
      limit?: number
      offset?: number
    }
    result: {
      items: AudioTrack[]
      total: number
    }
    permission: 'library:read'
  }
  'library.track.upsert': {
    payload: {
      track: Partial<AudioTrack> & { uuid: string }
    }
    result: {
      track: AudioTrack
      created: boolean
    }
    permission: 'library:write'
  }
  'library.track.delete': {
    payload: {
      uuid: string
      deleteFile?: boolean
      deleteCover?: boolean
    }
    result: {
      success: true
      uuid: string
    }
    permission: 'library:delete'
  }
  'library.track.updateLyrics': {
    payload: {
      uuid: string
      lyrics: string
    }
    result: {
      uuid: string
      saved: true
    }
    permission: 'library:write'
  }
  'files.list': {
    payload: {
      base?: 'storage' | 'music' | 'lyrics' | 'covers'
      directory?: string
    }
    result: Array<{
      name: string
      type: 'directory' | 'file'
    }>
    permission: 'files:read'
  }
  'files.writeText': {
    payload: {
      base?: 'storage' | 'lyrics'
      path: string
      content: string
    }
    result: {
      path: string
    }
    permission: 'files:write'
  }
  'files.transcode': {
    payload: {
      filename: string
      outputFormat?: string
    }
    result: {
      accepted: true
      filename: string
      message: string
    }
    permission: 'files:transcode'
  }
  'download.create': {
    payload: {
      url: string
      targetPath: string
      headers?: Record<string, string>
    }
    result: ScriptDownloadTask
    permission: 'network:fetch'
  }
  'download.get': {
    payload: {
      taskId: string
    }
    result: ScriptDownloadTask
    permission: 'network:fetch'
  }
  'download.list': {
    payload: {
      status?: ScriptDownloadTaskStatus
    }
    result: ScriptDownloadTask[]
    permission: 'network:fetch'
  }
  'network.fetch': {
    payload: {
      url: string
      method?: string
      headers?: Record<string, string>
      body?: string
    }
    result: {
      status: number
      headers: Record<string, string>
      body: string
    }
    permission: 'network:fetch'
  }
  'scripts.describeActions': {
    payload: Record<string, never>
    result: any[]
    permission: 'runtime:execute'
  }
  'logs.query': {
    payload: {
      limit?: number
    }
    result: ScriptExecutionLog[]
    permission: 'runtime:execute'
  }
}

export type ScriptHostActionPermissionMap = {
  [K in ScriptHostActionName]: ScriptHostActionMap[K]['permission']
}

export interface ScriptTypedActionRequest<TAction extends ScriptHostActionName = ScriptHostActionName> {
  scriptId: string
  action: TAction
  payload: ScriptHostActionMap[TAction]['payload']
  meta?: ScriptActionMeta
}

export interface ScriptTypedActionResponse<TAction extends ScriptHostActionName = ScriptHostActionName> {
  success: boolean
  action: TAction
  data?: ScriptHostActionMap[TAction]['result']
  error?: string
  logs?: ScriptExecutionLog[]
}

export const SCRIPT_HOST_ACTION_PERMISSIONS: ScriptHostActionPermissionMap = {
  'library.track.list': 'library:read',
  'library.track.upsert': 'library:write',
  'library.track.delete': 'library:delete',
  'library.track.updateLyrics': 'library:write',
  'files.list': 'files:read',
  'files.writeText': 'files:write',
  'files.transcode': 'files:transcode',
  'download.create': 'network:fetch',
  'download.get': 'network:fetch',
  'download.list': 'network:fetch',
  'network.fetch': 'network:fetch',
  'scripts.describeActions': 'runtime:execute',
  'logs.query': 'runtime:execute'
}

export function isScriptHostActionName(value: string): value is ScriptHostActionName {
  return value in SCRIPT_HOST_ACTION_PERMISSIONS
}

export function hasScriptPermission(
  granted: ScriptPermission[],
  action: ScriptHostActionName
) {
  return granted.includes(SCRIPT_HOST_ACTION_PERMISSIONS[action])
}
