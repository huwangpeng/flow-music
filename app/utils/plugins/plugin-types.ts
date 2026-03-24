export interface PluginSettingField {
  key: string
  label: string
  type: 'text' | 'boolean' | 'password' | 'number' | 'select'
  options?: string[]
  default?: any
}

export interface BasePlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  url: string
  settingsSchema?: PluginSettingField[]
}

export interface RemotePlugin extends BasePlugin {
  signature: string
  codeHash: string
  publicKey: string
  permissions: PluginPermission[]
}

export interface LocalPlugin extends RemotePlugin {
  code: string
  enabled: boolean
  settings: Record<string, any>
}

export type PluginPermission =
  | 'storage'
  | 'network'
  | 'notification'
  | 'clipboard'
  | 'automation'
  | 'core-modification'

export interface PluginHooks {
  onPlayerReady?: () => void
  onPlayerPlay?: (ctx: any) => void
  onPlayerPause?: (ctx: any) => void
  onPlayerStop?: (ctx: any) => void
  onTrackChange?: (ctx: any) => void
  onVolumeChange?: (volume: number) => void
  onPlaylistChange?: (playlist: any[]) => void
  onAppMounted?: () => void
  onAppBeforeUnmount?: () => void
}

export interface CoreModificationAPI {
  registerHook: (hookName: keyof PluginHooks, callback: Function) => void
  modifyPlayerState: (modifier: (state: any) => any) => void
  registerMiddleware: (type: string, middleware: Function) => void
  injectComponent: (location: string, component: any) => void
}

export interface PluginMessage {
  type: string
  data?: any
  pluginId?: string
}

export interface PluginWorkerAPI {
  postMessage: (message: PluginMessage) => void
  onMessage: (handler: (message: PluginMessage) => void) => void
  terminate: () => void
}

export interface RestrictedAPI {
  registry: {
    registerTrigger: (id: string, label: string, fn?: Function) => void
    registerAction: (id: string, label: string, fn?: Function) => void
  }
  storage: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
  }
  network: {
    fetch: (url: string, options?: RequestInit) => Promise<Response>
  }
  notification: {
    show: (title: string, body: string) => void
  }
  console: {
    log: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}
