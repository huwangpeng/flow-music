import type { PluginPermission } from './plugin-types'

export const PERMISSION_DESCRIPTIONS: Record<PluginPermission, string> = {
  storage: '访问本地存储（仅限插件数据）',
  network: '发起网络请求（无域名限制）',
  notification: '发送系统通知',
  clipboard: '读写剪贴板内容',
  automation: '注册自动化触发器和动作',
  'core-modification': '修改核心逻辑（高风险）'
}

export const DEFAULT_PERMISSIONS: PluginPermission[] = ['automation']

export const ALLOWED_NETWORK_DOMAINS: string[] = [
  'music.163.com',
  'y.qq.com',
  'api.spotify.com',
  'open.spotify.com',
  'soundcloud.com',
  'api.soundcloud.com',
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'localhost',
  '127.0.0.1'
]

export function validatePermissions(permissions: PluginPermission[]): void {
  const validPermissions = Object.keys(PERMISSION_DESCRIPTIONS) as PluginPermission[]
  const invalid = permissions.filter(p => !validPermissions.includes(p))
  
  if (invalid.length > 0) {
    throw new Error(`无效的权限声明：${invalid.join(', ')}`)
  }
}

export function hasPermission(
  pluginPermissions: PluginPermission[],
  required: PluginPermission
): boolean {
  return pluginPermissions.includes(required)
}

export function getStorageKeyPrefix(pluginId: string): string {
  return `plugin_${pluginId}_`
}

export function validateStorageKey(pluginId: string, key: string): boolean {
  const prefix = getStorageKeyPrefix(pluginId)
  return key.startsWith(prefix)
}

export function validateNetworkUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()
    
    // 允许所有域名（当前策略）
    // 如果需要限制特定域名，可以使用以下代码：
    // return ALLOWED_NETWORK_DOMAINS.some(domain => 
    //   hostname === domain || hostname.endsWith(`.${domain}`)
    // )
    
    return true
  } catch {
    return false
  }
}

export function auditLog(
  pluginId: string,
  action: string,
  details: Record<string, any>
): void {
  const log = {
    timestamp: Date.now(),
    pluginId,
    action,
    details
  }
  console.log('[Plugin Audit]', log)
}
