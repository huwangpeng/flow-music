import { usePluginsStore } from '~/stores/plugins'

export default defineNuxtPlugin(async (nuxtApp) => {
  if (typeof window !== 'undefined') {
    // Inject global API for remote plugins to use
    // Plugins can use `FlowAPI.registry.registerTrigger(...)`
    ;(window as any).FlowAPI = {
      registry: nuxtApp.$registry
    }
    
    // Give state time to mount
    nuxtApp.hook('app:mounted', () => {
      const store = usePluginsStore()
      store.plugins.forEach(plugin => {
        if (plugin.enabled) {
          try {
            console.log(`[Plugin Loader] Loading plugin: ${plugin.name} v${plugin.version}`)
            // Dynamically execute plugin code.
            const fn = new Function('FlowAPI', plugin.code)
            fn((window as any).FlowAPI)
            console.log(`[Plugin Loader] Successfully loaded ${plugin.name}`)
          } catch (e) {
            console.error(`[PluginLoader] Failed to execute plugin: ${plugin.name}`, e)
          }
        }
      })
    })
  }
})
