import type { PluginPermission, RestrictedAPI } from './plugin-types'
import {
  hasPermission,
  validateStorageKey,
  validateNetworkUrl,
  auditLog,
  getStorageKeyPrefix,
  ALLOWED_NETWORK_DOMAINS
} from './permissions'

export function createRestrictedAPI(
  pluginId: string,
  permissions: PluginPermission[]
): RestrictedAPI {
  const storage = hasPermission(permissions, 'storage')
    ? {
        getItem: (key: string) => {
          if (!validateStorageKey(pluginId, key)) {
            auditLog(pluginId, 'storage_access_denied', { key })
            return null
          }
          const value = localStorage.getItem(key)
          auditLog(pluginId, 'storage_get', { key, hasValue: !!value })
          return value
        },
        setItem: (key: string, value: string) => {
          if (!validateStorageKey(pluginId, key)) {
            auditLog(pluginId, 'storage_set_denied', { key })
            return
          }
          localStorage.setItem(key, value)
          auditLog(pluginId, 'storage_set', { key })
        }
      }
    : {
        getItem: () => {
          auditLog(pluginId, 'storage_access_denied', { reason: 'no_permission' })
          return null
        },
        setItem: () => {
          auditLog(pluginId, 'storage_set_denied', { reason: 'no_permission' })
        }
      }

  const network = hasPermission(permissions, 'network')
    ? {
        fetch: async (url: string, options?: RequestInit) => {
          if (!validateNetworkUrl(url)) {
            auditLog(pluginId, 'network_access_denied', { url })
            throw new Error(`Network access to ${new URL(url).hostname} is not allowed`)
          }
          
          auditLog(pluginId, 'network_request', {
            url,
            method: options?.method || 'GET'
          })
          
          return fetch(url, options)
        }
      }
    : {
        fetch: () => {
          auditLog(pluginId, 'network_access_denied', { reason: 'no_permission' })
          return Promise.reject(new Error('Network permission not allowed'))
        }
      }

  const notification = hasPermission(permissions, 'notification')
    ? {
        show: (title: string, body: string) => {
          auditLog(pluginId, 'notification', { title, body })
          if (typeof Notification !== 'undefined') {
            new Notification(title, { body })
          }
        }
      }
    : {
        show: () => {
          auditLog(pluginId, 'notification_denied', { reason: 'no_permission' })
        }
      }

  return {
    registry: {
      registerTrigger: (id: string, label: string) => {
        auditLog(pluginId, 'register_trigger', { id, label })
        self.postMessage({
          type: 'REGISTER_TRIGGER',
          pluginId,
          data: { id, label }
        })
      },
      registerAction: (id: string, label: string) => {
        auditLog(pluginId, 'register_action', { id, label })
        self.postMessage({
          type: 'REGISTER_ACTION',
          pluginId,
          data: { id, label }
        })
      }
    },
    storage,
    network,
    notification,
    console: {
      log: (...args: any[]) => {
        console.log(`[Plugin ${pluginId}]`, ...args)
      },
      error: (...args: any[]) => {
        console.error(`[Plugin ${pluginId}]`, ...args)
      }
    }
  }
}

export function createMockRestrictedAPI(): RestrictedAPI {
  return {
    registry: {
      registerTrigger: () => {},
      registerAction: () => {}
    },
    storage: {
      getItem: () => null,
      setItem: () => {}
    },
    network: {
      fetch: () => Promise.reject(new Error('Network access not available'))
    },
    notification: {
      show: () => {}
    },
    console: {
      log: () => {},
      error: () => {}
    }
  }
}
