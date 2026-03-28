import { useScriptsStore } from '~/stores/scripts'
import { registerScriptActions, registerScriptFlowNodes, registerScriptPages } from '~/server/utils/script-registry'

export default defineNuxtPlugin(async (nuxtApp) => {
  if (typeof window !== 'undefined') {
    ;(window as any).FlowAPI = {
      registry: nuxtApp.$registry,
      scripts: {
        callAction: async (scriptId: string, action: string, payload?: Record<string, any>) => {
          return await $fetch('/api/scripts/actions', {
            method: 'POST',
            body: {
              scriptId,
              action,
              payload
            }
          })
        }
      }
    }
    
    nuxtApp.hook('app:mounted', () => {
      const store = useScriptsStore()
      store.enabledScripts.forEach(script => {
        if (script.enabled) {
          try {
            console.log(`[Script Loader] Loading script: ${script.name} v${script.version}`)
            registerScriptActions(script.id, script.actions || [])
            registerScriptFlowNodes(script.id, script.flowNodes || [])
            registerScriptPages(script.id, script.pages || [])
            const fn = new Function('FlowAPI', 'ScriptContext', script.code)
            const scriptContext = {
              settings: script.settings,
              permissions: script.permissions,
              configPage: script.configPage,
              pages: script.pages,
              actions: script.actions,
              flowNodes: script.flowNodes,
              meta: {
                id: script.id,
                name: script.name,
                source: script.source,
                sourceType: script.sourceType
              }
            }
            fn((window as any).FlowAPI, scriptContext)
            console.log(`[Script Loader] Successfully loaded ${script.name}`)
          } catch (e) {
            console.error(`[ScriptLoader] Failed to execute script: ${script.name}`, e)
          }
        }
      })
    })
  }
})
