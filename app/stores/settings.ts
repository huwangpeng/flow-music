import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  role: 'admin' | 'user'
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  defaultQuality: string
  autoConvert: boolean
  convertFormat: string
  autoTag: boolean
  autoCover: boolean
  storagePath?: string
  geekMode: boolean
  apiKeys: {
    neteaseMusic: string
    openai: string
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const settings = ref<AppSettings>({
    theme: 'system',
    language: 'zh-CN',
    defaultQuality: 'lossless',
    autoConvert: false,
    convertFormat: 'mp3',
    autoTag: true,
    autoCover: true,
    geekMode: false,
    apiKeys: {
      neteaseMusic: '',
      openai: ''
    }
  })

  async function clearCache() {
    if (typeof window === 'undefined') return
    return new Promise<void>(resolve => {
      setTimeout(() => {
        console.log('已清理缓存');
        resolve();
      }, 1000);
    });
  }

  function login(userData: User, token: string) {
    user.value = userData
    isAuthenticated.value = true
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function restoreSession() {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        user.value = JSON.parse(userStr)
        isAuthenticated.value = true
      } catch {
        logout()
      }
    }
  }

  function updateSettings(updates: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...updates }
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings', JSON.stringify(settings.value))
    }
  }

  function loadSettings() {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('settings')
    if (saved) {
      try {
        settings.value = { ...settings.value, ...JSON.parse(saved) }
      } catch {
        console.error('Failed to load settings')
      }
    }
  }

  function setTheme(theme: 'light' | 'dark' | 'system') {
    settings.value.theme = theme
    updateSettings({ theme })
    applyTheme(theme)
  }

  function applyTheme(theme: 'light' | 'dark' | 'system') {
    if (typeof window === 'undefined') return
    const html = document.documentElement
    html.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      html.classList.add(systemTheme)
    } else {
      html.classList.add(theme)
    }
  }

  return {
    user,
    isAuthenticated,
    settings,
    login,
    logout,
    restoreSession,
    updateSettings,
    loadSettings,
    setTheme,
    applyTheme,
    clearCache
  }
})