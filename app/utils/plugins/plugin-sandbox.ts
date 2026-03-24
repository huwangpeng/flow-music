import type { PluginMessage } from './plugin-types'
import { createPluginWorker } from './plugin-worker'

export interface PluginSandbox {
  pluginId: string
  postMessage: (message: PluginMessage) => void
  onMessage: (handler: (message: PluginMessage) => void) => void
  terminate: () => Promise<void>
  executeTrigger: (triggerId: string, context: any) => Promise<any>
  executeAction: (actionId: string, context: any) => Promise<any>
}

const messageHandlers = new Map<string, Set<(message: PluginMessage) => void>>()
const pendingRequests = new Map<string, Map<number, { resolve: Function, reject: Function, timeout?: NodeJS.Timeout }>>()
let requestIdCounter = 0

export function createPluginSandbox(
  pluginId: string,
  code: string,
  permissions: string[]
): Promise<PluginSandbox> {
  return new Promise((resolve, reject) => {
    const worker = createPluginWorker()
    const sandbox: PluginSandbox = {
      pluginId,
      postMessage: (message: PluginMessage) => {
        worker.postMessage({ ...message, pluginId })
      },
      onMessage: (handler: (message: PluginMessage) => void) => {
        if (!messageHandlers.has(pluginId)) {
          messageHandlers.set(pluginId, new Set())
        }
        messageHandlers.get(pluginId)!.add(handler)
      },
      terminate: async () => {
        return terminatePlugin(pluginId, worker)
      },
      executeTrigger: async (triggerId: string, context: any) => {
        return executeInWorker(pluginId, worker, 'EXECUTE_TRIGGER', { triggerId, context })
      },
      executeAction: async (actionId: string, context: any) => {
        return executeInWorker(pluginId, worker, 'EXECUTE_ACTION', { actionId, context })
      }
    }

    worker.onmessage = (e: MessageEvent<PluginMessage>) => {
      const message = e.data
      
      const handlers = messageHandlers.get(pluginId)
      if (handlers) {
        handlers.forEach(handler => handler(message))
      }

      if (message.type === 'INIT_SUCCESS') {
        resolve(sandbox)
      } else if (message.type === 'INIT_ERROR') {
        reject(new Error(message.data?.error || 'Failed to initialize plugin'))
      }

      const requestMap = pendingRequests.get(pluginId)
      if (requestMap && message.data?.requestId !== undefined) {
        const request = requestMap.get(message.data.requestId)
        if (request) {
          if (request.timeout) {
            clearTimeout(request.timeout)
          }
          requestMap.delete(message.data.requestId)
          
          if (message.type.endsWith('_RESULT')) {
            request.resolve(message.data.result)
          } else if (message.type.endsWith('_ERROR')) {
            request.reject(new Error(message.data.error))
          }
        }
      }
    }

    worker.onerror = (error) => {
      reject(new Error(`Worker error: ${error.message}`))
    }

    worker.postMessage({
      type: 'INIT',
      pluginId,
      data: { code, permissions }
    })

    const initTimeout = setTimeout(() => {
      worker.terminate()
      reject(new Error('Plugin initialization timeout'))
    }, 30000)

    if (!pendingRequests.has(pluginId)) {
      pendingRequests.set(pluginId, new Map())
    }
  })
}

async function executeInWorker(
  pluginId: string,
  worker: Worker,
  messageType: string,
  data: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = ++requestIdCounter
    const requestMap = pendingRequests.get(pluginId) || new Map()
    
    const timeout = setTimeout(() => {
      if (requestMap.has(requestId)) {
        requestMap.delete(requestId)
        reject(new Error('Execution timeout'))
      }
    }, 30000)

    requestMap.set(requestId, { resolve, reject, timeout })
    pendingRequests.set(pluginId, requestMap)

    worker.postMessage({
      type: messageType,
      pluginId,
      data: { ...data, requestId }
    })
  })
}

async function terminatePlugin(pluginId: string, worker: Worker): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      worker.terminate()
      cleanupPlugin(pluginId)
      resolve()
    }, 5000)

    worker.postMessage({
      type: 'TERMINATE',
      pluginId
    })

    const checkTerminated = (e: MessageEvent<PluginMessage>) => {
      if (e.data.type === 'TERMINATED' && e.data.pluginId === pluginId) {
        clearTimeout(timeout)
        worker.terminate()
        cleanupPlugin(pluginId)
        resolve()
      }
    }

    worker.addEventListener('message', checkTerminated, { once: true })
  })
}

function cleanupPlugin(pluginId: string): void {
  messageHandlers.delete(pluginId)
  pendingRequests.delete(pluginId)
}

export function cleanupAllSandboxes(): void {
  messageHandlers.clear()
  pendingRequests.forEach((requestMap, pluginId) => {
    requestMap.forEach((request) => {
      if (request.timeout) {
        clearTimeout(request.timeout)
      }
      request.reject(new Error('Sandbox cleanup'))
    })
  })
  pendingRequests.clear()
}
