const workerCode = `
let pluginContext = null
let pluginId = null
let registeredTriggers = new Map()
let registeredActions = new Map()

self.onmessage = async function(e) {
  const { type, data, pluginId: pid } = e.data
  
  if (pid) {
    pluginId = pid
  }
  
  try {
    switch (type) {
      case 'INIT': {
        const { code, permissions } = data
        
        const restrictedAPI = {
          registry: {
            registerTrigger: (id, label) => {
              registeredTriggers.set(id, { label })
              self.postMessage({
                type: 'REGISTER_TRIGGER',
                pluginId,
                data: { id, label }
              })
            },
            registerAction: (id, label) => {
              registeredActions.set(id, { label })
              self.postMessage({
                type: 'REGISTER_ACTION',
                pluginId,
                data: { id, label }
              })
            }
          },
          storage: permissions.includes('storage') ? {
            getItem: (key) => {
              if (!key.startsWith('plugin_' + pluginId + '_')) {
                return null
              }
              try {
                const value = localStorage.getItem(key)
                return value
              } catch (err) {
                return null
              }
            },
            setItem: (key, value) => {
              if (!key.startsWith('plugin_' + pluginId + '_')) {
                return
              }
              try {
                localStorage.setItem(key, value)
              } catch (err) {}
              }
          } : {
            getItem: () => null,
            setItem: () => {}
          },
          network: permissions.includes('network') ? {
            fetch: async (url, options) => {
              try {
                return await fetch(url, options)
              } catch (err) {
                throw err
              }
            }
          } : {
            fetch: () => Promise.reject(new Error('Network permission not allowed'))
          },
          notification: permissions.includes('notification') ? {
            show: (title, body) => {
              self.postMessage({
                type: 'NOTIFICATION_REQUEST',
                pluginId,
                data: { title, body }
              })
            }
          } : {
            show: () => {}
          },
          core: permissions.includes('core-modification') ? {
            registerHook: (hookName, callback) => {
              self.postMessage({
                type: 'REGISTER_HOOK',
                pluginId,
                data: { hookName }
              })
            },
            modifyPlayerState: (modifier) => {
              self.postMessage({
                type: 'MODIFY_PLAYER_STATE',
                pluginId
              })
            },
            registerMiddleware: (type, middleware) => {
              self.postMessage({
                type: 'REGISTER_MIDDLEWARE',
                pluginId,
                data: { type }
              })
            },
            injectComponent: (location, component) => {
              self.postMessage({
                type: 'INJECT_COMPONENT',
                pluginId,
                data: { location }
              })
            }
          } : {
            registerHook: () => {},
            modifyPlayerState: () => {},
            registerMiddleware: () => {},
            injectComponent: () => {}
          },
          console: {
            log: (...args) => {
              self.postMessage({
                type: 'CONSOLE_LOG',
                pluginId,
                data: args
              })
            },
            error: (...args) => {
              self.postMessage({
                type: 'CONSOLE_ERROR',
                pluginId,
                data: args
              })
            }
          }
        }
        
        try {
          const fn = new Function('FlowAPI', code)
          pluginContext = fn(restrictedAPI)
          
          self.postMessage({
            type: 'INIT_SUCCESS',
            pluginId,
            data: {
              triggers: Array.from(registeredTriggers.entries()),
              actions: Array.from(registeredActions.entries()),
              hasCoreModification: permissions.includes('core-modification')
            }
          })
        } catch (err) {
          self.postMessage({
            type: 'INIT_ERROR',
            pluginId,
            data: { error: err.message }
          })
        }
        break
      }
      
      case 'EXECUTE_TRIGGER': {
        const { triggerId, context } = data
        if (pluginContext && pluginContext.triggers && pluginContext.triggers.get(triggerId)) {
          try {
            const result = await pluginContext.triggers.get(triggerId).execute(context)
            self.postMessage({
              type: 'TRIGGER_RESULT',
              pluginId,
              data: { triggerId, result }
            })
          } catch (err) {
            self.postMessage({
              type: 'TRIGGER_ERROR',
              pluginId,
              data: { triggerId, error: err.message }
            })
          }
        }
        break
      }
      
      case 'EXECUTE_ACTION': {
        const { actionId, context } = data
        if (pluginContext && pluginContext.actions && pluginContext.actions.get(actionId)) {
          try {
            const result = await pluginContext.actions.get(actionId).execute(context)
            self.postMessage({
              type: 'ACTION_RESULT',
              pluginId,
              data: { actionId, result }
            })
          } catch (err) {
            self.postMessage({
              type: 'ACTION_ERROR',
              pluginId,
              data: { actionId, error: err.message }
            })
          }
        }
        break
      }
      
      case 'TERMINATE': {
        registeredTriggers.clear()
        registeredActions.clear()
        pluginContext = null
        self.postMessage({
          type: 'TERMINATED',
          pluginId
        })
        break
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'WORKER_ERROR',
      pluginId,
      data: { error: err.message }
    })
  }
}
`

export function createPluginWorkerBlob(): Blob {
  return new Blob([workerCode], { type: 'application/javascript' })
}

export function createPluginWorker(): Worker {
  const blob = createPluginWorkerBlob()
  const workerUrl = URL.createObjectURL(blob)
  return new Worker(workerUrl)
}
