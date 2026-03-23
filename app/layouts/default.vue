<template>
  <div class="relative flex h-screen bg-white dark:bg-black overflow-hidden">
    <!-- 移动端遮罩 -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        @click="closeSidebar"
        class="fixed inset-0 z-40 bg-black/50 dark:bg-black/80 lg:hidden"
      />
    </Transition>

    <!-- 侧边栏 (移除 v-if, 改为 CSS Transform) -->
    <aside
      :class="[
        'fixed lg:absolute inset-y-0 left-0 z-50 w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
        <h1 class="text-xl font-bold text-black dark:text-white tracking-wide">Flow Music</h1>
        <button
          @click="closeSidebar"
          class="lg:hidden text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-200"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <nav class="mt-6 px-3 space-y-1">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          @click="closeSidebarOnMobile"
          :class="[
            'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
            $route.path === item.href
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-black dark:hover:text-white'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5 mr-3 flex-shrink-0" />
          <span class="truncate">{{ item.name }}</span>
        </NuxtLink>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
        <div class="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200 cursor-pointer">
          <div class="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-bold text-white dark:text-black">U</span>
          </div>
          <div class="ml-3 min-w-0">
            <p class="text-sm font-medium text-black dark:text-white truncate">用户</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">user@flowmusic.com</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div 
      :class="[
        'flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out w-full',
        isOpen ? 'lg:ml-64' : 'lg:ml-0'
      ]"
    >
      <header class="flex items-center justify-between h-16 px-4 lg:px-6 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center">
          <button
            @click="toggleSidebar"
            class="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all duration-200"
          >
            <Menu class="w-6 h-6" />
          </button>

          <div class="hidden sm:block ml-4">
            <div class="relative group">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="搜索音乐、艺术家、专辑..."
                class="w-64 lg:w-80 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            @click="e => cycleTheme(e)"
            title="切换颜色模式"
            class="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all duration-200"
          >
            <component :is="themeIcon" class="w-5 h-5" />
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-black p-4 lg:p-6 w-full">
        <Transition name="page" mode="out-in">
          <slot />
        </Transition>
      </main>

      <ClientOnly>
        <PlayerBar />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Home,
  Music,
  Zap,
  Puzzle,
  Settings,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Monitor
} from 'lucide-vue-next'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()

const isOpen = ref(true)

const navigation = [
  { name: '音乐库', href: '/', icon: Home },
  { name: '自动化', href: '/automation', icon: Zap },
  { name: '插件', href: '/plugins', icon: Puzzle },
  { name: '设置', href: '/settings', icon: Settings },
]

function cycleTheme(event?: MouseEvent) {
  const performCycle = () => {
    const current = settingsStore.settings.theme
    if (current === 'system') settingsStore.setTheme('light')
    else if (current === 'light') settingsStore.setTheme('dark')
    else settingsStore.setTheme('system')
  }

  // 如果不支持 startViewTransition 或者没有点击事件，则直接切换
  if (!event || !document.startViewTransition) {
    performCycle()
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  )

  const transition = document.startViewTransition(() => {
    performCycle()
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ]
    document.documentElement.animate(
      {
        clipPath: settingsStore.settings.theme === 'dark' ? clipPath : [...clipPath].reverse(),
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        pseudoElement: settingsStore.settings.theme === 'dark' 
          ? '::view-transition-new(root)' 
          : '::view-transition-old(root)',
      }
    )
  })
}

const themeIcon = computed(() => {
  if (settingsStore.settings.theme === 'light') return Sun
  if (settingsStore.settings.theme === 'dark') return Moon
  return Monitor
})

function toggleSidebar() {
  isOpen.value = !isOpen.value
}

function closeSidebar() {
  isOpen.value = false
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 1024) {
    isOpen.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}

.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.98);
}
</style>