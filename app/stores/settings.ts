import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'flow-music-theme'
const SETTINGS_STORAGE_KEY = 'flow-music-settings'

function loadThemeFromLocalStorage(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved) {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved
      }
    }
  } catch (error) {
    console.error('加载主题设置失败:', error)
  }
  return 'system'
}

function saveThemeToLocalStorage(theme: ThemeMode) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch (error) {
    console.error('保存主题设置失败:', error)
  }
}

interface PersistedSettings extends Partial<AppSettings> {
  theme?: ThemeMode
}

export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  role: 'admin' | 'user'
}

export interface AppSettings {
  theme: ThemeMode
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
  const defaultSettings: AppSettings = {
    theme: loadThemeFromLocalStorage(),
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
  }
  const settings = ref<AppSettings>(defaultSettings)

  function persistSettings(nextSettings: AppSettings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

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
    settings.value = {
      ...settings.value,
      ...updates,
      apiKeys: {
        ...settings.value.apiKeys,
        ...updates.apiKeys,
      },
    }
    persistSettings(settings.value)
  }

  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = {
          ...defaultSettings,
          ...parsed,
          apiKeys: {
            ...defaultSettings.apiKeys,
            ...parsed.apiKeys,
          },
        }
        return
      } catch {
        // 解析失败，使用默认值
      }
    }
    settings.value = defaultSettings
  }

  function setTheme(theme: ThemeMode) {
    settings.value.theme = theme
    updateSettings({ theme })
    applyTheme(theme)
    saveThemeToLocalStorage(theme)
  }

  function applyTheme(theme: ThemeMode) {
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
