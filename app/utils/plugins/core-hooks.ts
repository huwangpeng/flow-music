import type { PluginHooks, CoreModificationAPI } from './plugin-types'

const pluginHooks: Map<string, Map<string, Function[]>> = new Map()
const playerStateModifiers: Array<(state: any) => any> = []
const middlewares: Map<string, Function[]> = new Map()
const injectedComponents: Map<string, any[]> = new Map()

export function createCoreModificationAPI(pluginId: string): CoreModificationAPI {
  return {
    registerHook(hookName: keyof PluginHooks, callback: Function) {
      if (!pluginHooks.has(hookName)) {
        pluginHooks.set(hookName, new Map())
      }
      const hooks = pluginHooks.get(hookName)!
      if (!hooks.has(pluginId)) {
        hooks.set(pluginId, [])
      }
      hooks.get(pluginId)!.push(callback)
      console.log(`[Plugin ${pluginId}] Registered hook: ${hookName}`)
    },

    modifyPlayerState(modifier: (state: any) => any) {
      playerStateModifiers.push(modifier)
      console.log(`[Plugin ${pluginId}] Registered player state modifier`)
    },

    registerMiddleware(type: string, middleware: Function) {
      if (!middlewares.has(type)) {
        middlewares.set(type, [])
      }
      middlewares.get(type)!.push(middleware)
      console.log(`[Plugin ${pluginId}] Registered middleware: ${type}`)
    },

    injectComponent(location: string, component: any) {
      if (!injectedComponents.has(location)) {
        injectedComponents.set(location, [])
      }
      injectedComponents.get(location)!.push(component)
      console.log(`[Plugin ${pluginId}] Injected component at: ${location}`)
    }
  }
}

export function executeHooks(hookName: keyof PluginHooks, context?: any) {
  const hooks = pluginHooks.get(hookName)
  if (!hooks) return

  hooks.forEach((pluginHooks, pluginId) => {
    pluginHooks.forEach(callback => {
      try {
        callback(context)
      } catch (error) {
        console.error(`[Plugin Hook Error] ${pluginId} - ${hookName}:`, error)
      }
    })
  })
}

export function applyPlayerStateModifiers(state: any): any {
  let modifiedState = { ...state }
  
  for (const modifier of playerStateModifiers) {
    try {
      modifiedState = modifier(modifiedState)
    } catch (error) {
      console.error('[Player State Modifier Error]:', error)
    }
  }
  
  return modifiedState
}

export function runMiddleware(type: string, context: any): any {
  const middlewaresList = middlewares.get(type)
  if (!middlewaresList) return context

  let modifiedContext = { ...context }
  
  for (const middleware of middlewaresList) {
    try {
      const result = middleware(modifiedContext)
      if (result !== undefined) {
        modifiedContext = result
      }
    } catch (error) {
      console.error(`[Middleware Error] ${type}:`, error)
    }
  }
  
  return modifiedContext
}

export function getInjectedComponents(location: string): any[] {
  return injectedComponents.get(location) || []
}

export function clearPluginHooks(pluginId: string) {
  pluginHooks.forEach((hooks, hookName) => {
    if (hooks.has(pluginId)) {
      hooks.delete(pluginId)
    }
  })
  
  const index = playerStateModifiers.findIndex(m => 
    m.toString().includes(pluginId)
  )
  if (index !== -1) {
    playerStateModifiers.splice(index, 1)
  }
  
  middlewares.forEach((middlewaresList, type) => {
    const filtered = middlewaresList.filter(m => 
      !m.toString().includes(pluginId)
    )
    if (filtered.length === 0) {
      middlewares.delete(type)
    } else {
      middlewares.set(type, filtered)
    }
  })
  
  injectedComponents.forEach((components, location) => {
    const filtered = components.filter(c => 
      !c.toString().includes(pluginId)
    )
    if (filtered.length === 0) {
      injectedComponents.delete(location)
    } else {
      injectedComponents.set(location, filtered)
    }
  })
  
  console.log(`[Plugin ${pluginId}] Hooks cleared`)
}

export function getPluginHooksInfo() {
  const info: Record<string, any> = {
    hooks: {} as Record<string, number>,
    stateModifiers: playerStateModifiers.length,
    middlewares: {} as Record<string, number>,
    injectedComponents: {} as Record<string, number>
  }
  
  pluginHooks.forEach((hooks, hookName) => {
    info.hooks[hookName] = hooks.size
  })
  
  middlewares.forEach((middlewaresList, type) => {
    info.middlewares[type] = middlewaresList.length
  })
  
  injectedComponents.forEach((components, location) => {
    info.injectedComponents[location] = components.length
  })
  
  return info
}
