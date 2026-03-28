import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ScriptDefinition, ScriptConfigPage, ScriptExecutionLog, ScriptManifest, ScriptPermission } from '~/types/scripts'
import type { ScriptPackageManifest } from '~/types/script-packages'

function normalizeScript(raw: Partial<ScriptDefinition> & { id: string; name: string }): ScriptDefinition {
  const configPage = raw.configPage && Array.isArray(raw.configPage.fields)
    ? raw.configPage
    : undefined

  return {
    id: raw.id,
    name: raw.name,
    version: raw.version || '1.0.0',
    description: raw.description || '',
    author: raw.author || '未知',
    source: raw.source || raw.name,
    sourceType: raw.sourceType || 'inline',
    code: raw.code || '',
    enabled: raw.enabled ?? true,
    permissions: Array.isArray(raw.permissions) ? raw.permissions as ScriptPermission[] : ['runtime:execute', 'ui:config'],
    configPage,
    pages: Array.isArray(raw.pages) ? raw.pages : [],
    actions: Array.isArray(raw.actions) ? raw.actions : [],
    flowNodes: Array.isArray(raw.flowNodes) ? raw.flowNodes : [],
    settings: raw.settings && typeof raw.settings === 'object' ? raw.settings : {},
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  }
}

export const useScriptsStore = defineStore('scripts', () => {
  const scripts = ref<ScriptDefinition[]>([])
  const logs = ref<ScriptExecutionLog[]>([])

  function loadScripts() {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('flow-scripts')
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      scripts.value = Array.isArray(parsed)
        ? parsed
            .filter((item): item is Partial<ScriptDefinition> & { id: string; name: string } => Boolean(item?.id && item?.name))
            .map(item => normalizeScript(item))
        : []
    } catch {
      scripts.value = []
    }
  }

  function saveScripts() {
    if (typeof window === 'undefined') return
    localStorage.setItem('flow-scripts', JSON.stringify(scripts.value))
  }

  function addScript(input: Omit<ScriptDefinition, 'id' | 'settings'> & { id?: string; settings?: Record<string, any> }) {
    const nextScript = normalizeScript({
      ...input,
      id: input.id || `script-${Date.now()}`,
      settings: input.settings || buildDefaultSettings(input.configPage)
    })

    scripts.value.push(nextScript)
    saveScripts()
    return nextScript.id
  }

  function registerManifest(manifest: ScriptManifest, code: string) {
    const existing = scripts.value.find(script => script.id === manifest.id)
    if (existing) {
      existing.name = manifest.name
      existing.version = manifest.version
      existing.description = manifest.description
      existing.author = manifest.author
      existing.source = manifest.source
      existing.sourceType = manifest.sourceType
      existing.permissions = manifest.permissions
      existing.configPage = manifest.configPage
      existing.pages = manifest.pages || []
      existing.actions = manifest.actions || []
      existing.flowNodes = manifest.flowNodes || []
      existing.code = code
      existing.updatedAt = new Date().toISOString()
      saveScripts()
      return existing.id
    }

    return addScript({
      ...manifest,
      code,
      enabled: true
    })
  }

  function registerPackageManifest(manifest: ScriptPackageManifest, code = '') {
    return registerManifest(manifest, code)
  }

  function removeScript(id: string) {
    scripts.value = scripts.value.filter(script => script.id !== id)
    saveScripts()
  }

  function toggleScript(id: string) {
    const script = scripts.value.find(item => item.id === id)
    if (!script) return
    script.enabled = !script.enabled
    saveScripts()
  }

  function updateScriptSettings(id: string, settings: Record<string, any>) {
    const script = scripts.value.find(item => item.id === id)
    if (!script) return
    script.settings = { ...settings }
    script.updatedAt = new Date().toISOString()
    saveScripts()
  }

  function appendLog(entry: ScriptExecutionLog) {
    logs.value.unshift(entry)
    if (logs.value.length > 100) {
      logs.value.length = 100
    }
  }

  async function loadLogs(scriptId?: string) {
    const query = scriptId ? `?scriptId=${encodeURIComponent(scriptId)}` : ''
    logs.value = await $fetch<ScriptExecutionLog[]>(`/api/scripts/logs${query}`)
    return logs.value
  }

  function getScript(id: string) {
    return scripts.value.find(script => script.id === id)
  }

  async function restoreInstalledPackages() {
    const installed = await $fetch<Array<{ manifest: ScriptPackageManifest }>>('/api/scripts/packages/installed')
    for (const item of installed) {
      registerPackageManifest(item.manifest)
    }
    saveScripts()
    return scripts.value
  }

  const enabledScripts = computed(() => scripts.value.filter(script => script.enabled))

  if (typeof window !== 'undefined') {
    loadScripts()
  }

  return {
    scripts,
    enabledScripts,
    loadScripts,
    saveScripts,
    addScript,
    registerManifest,
    registerPackageManifest,
    removeScript,
    toggleScript,
    updateScriptSettings,
    getScript,
    restoreInstalledPackages,
    logs,
    appendLog,
    loadLogs
  }
})

function buildDefaultSettings(configPage?: ScriptConfigPage) {
  const settings: Record<string, any> = {}
  if (!configPage) return settings
  for (const field of configPage.fields) {
    if (field.default !== undefined) {
      settings[field.key] = field.default
    }
  }
  return settings
}
