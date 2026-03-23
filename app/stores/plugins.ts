import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface PluginSettingField {
  key: string
  label: string
  type: 'text' | 'boolean' | 'password' | 'number' | 'select'
  options?: string[]
  default?: any
}

export interface RemotePlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  url: string // GitHub raw URL to the JS bundle
  settingsSchema?: PluginSettingField[]
}

export interface LocalPlugin extends RemotePlugin {
  code: string
  enabled: boolean
  settings: Record<string, any>
}

export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<LocalPlugin[]>([])
  const storePlugins = ref<RemotePlugin[]>([])
  const isFetchingStore = ref(false)

  // 默认商店地址: 这里填写真实的或模拟的 GitHub Raw JSON 地址
  const STORE_URL = 'https://raw.githubusercontent.com/tanweai/pua/main/plugins.json'

  function loadPlugins() {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('flow-plugins')
    if (saved) {
      try {
        plugins.value = JSON.parse(saved)
      } catch {
        plugins.value = []
      }
    }
  }

  function savePlugins() {
    if (typeof window === 'undefined') return
    localStorage.setItem('flow-plugins', JSON.stringify(plugins.value))
  }

  async function fetchStorePlugins() {
    isFetchingStore.value = true
    try {
      const res = await $fetch<RemotePlugin[]>(STORE_URL).catch(() => null)
      
      if (res && Array.isArray(res)) {
        storePlugins.value = res
      } else {
        // Fallback Mock 数据
        storePlugins.value = [
          {
            id: 'plugin-discord-rpc',
            name: 'Discord RPC',
            version: '1.0.0',
            description: '在 Discord 状态中显示当前正在播放的音乐进度',
            author: 'Flow Team',
            url: 'https://raw.githubusercontent.com/tanweai/pua/main/example-rpc.js',
            settingsSchema: [
              { key: 'showCover', label: '显示专辑封面', type: 'boolean', default: true },
              { key: 'customText', label: '自定义后缀', type: 'text', default: '🎵' }
            ]
          },
          {
            id: 'plugin-flac-parser',
            name: '先进 FLAC 解析器',
            version: '1.2.0',
            description: '提供更深度的 FLAC 元数据读取与解析能力',
            author: 'Community',
            url: 'https://raw.githubusercontent.com/tanweai/pua/main/example-flac.js',
            settingsSchema: [
              { key: 'maxCache', label: '最大缓存 (MB)', type: 'number', default: 50 }
            ]
          }
        ]
      }
    } catch (e) {
      console.error('Failed to fetch plugin store', e)
    } finally {
      isFetchingStore.value = false
    }
  }

  async function installPlugin(remote: RemotePlugin) {
    if (plugins.value.some(p => p.id === remote.id)) return // Already installed
    
    try {
      // 获取外部代码
      const code = await $fetch<string>(remote.url).catch(() => `console.log("Mock code for ${remote.name}");`)
      
      // 初始化默认设置
      const defaultSettings: Record<string, any> = {}
      if (remote.settingsSchema) {
        for (const field of remote.settingsSchema) {
          if (field.default !== undefined) {
            defaultSettings[field.key] = field.default
          }
        }
      }

      const newPlugin: LocalPlugin = {
        ...remote,
        code: typeof code === 'string' ? code : `console.log("Mock code for ${remote.name}");`,
        enabled: true,
        settings: defaultSettings
      }
      
      plugins.value.push(newPlugin)
      savePlugins()
      return true
    } catch (e) {
      console.error('Failed to install plugin', e)
      return false
    }
  }

  function removePlugin(id: string) {
    plugins.value = plugins.value.filter(p => p.id !== id)
    savePlugins()
  }

  function togglePlugin(id: string) {
    const p = plugins.value.find(x => x.id === id)
    if (p) {
      p.enabled = !p.enabled
      savePlugins()
    }
  }

  if (typeof window !== 'undefined') {
    loadPlugins()
  }

  return {
    plugins,
    storePlugins,
    isFetchingStore,
    loadPlugins,
    savePlugins,
    fetchStorePlugins,
    installPlugin,
    removePlugin,
    togglePlugin
  }
})