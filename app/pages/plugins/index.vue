<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-black dark:text-white">插件</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">扩展您的音乐管理系统</p>
      </div>
      <Button variant="primary" leftIcon="plus" @click="openAddModal">
        添加插件
      </Button>
    </div>

    <!-- 已安装插件列表 -->
    <div v-if="pluginsStore.plugins.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TransitionGroup name="plugin-list">
        <div
          v-for="plugin in pluginsStore.plugins"
          :key="plugin.id"
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700"
        >
          <!-- 插件头部 -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-lg flex items-center justify-center"
                :class="plugin.enabled
                  ? 'bg-black dark:bg-white'
                  : 'bg-gray-200 dark:bg-gray-800'"
              >
                <Puzzle
                  class="w-6 h-6"
                  :class="plugin.enabled ? 'text-white dark:text-black' : 'text-gray-400'"
                />
              </div>
              <div>
                <h3
                  class="font-semibold text-base"
                  :class="plugin.enabled ? 'text-black dark:text-white' : 'text-gray-400'"
                >
                  {{ plugin.name }}
                </h3>
                <span class="text-xs text-gray-400">v{{ plugin.version }}</span>
              </div>
            </div>

            <!-- 启用/禁用开关 -->
            <button
              @click="pluginsStore.togglePlugin(plugin.id)"
              class="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="plugin.enabled
                ? 'bg-black dark:bg-white focus:ring-gray-400'
                : 'bg-gray-300 dark:bg-gray-700'"
            >
              <span
                class="absolute top-1 w-4 h-4 rounded-full transition-all duration-300"
                :class="plugin.enabled
                  ? 'left-7 bg-gray-800 dark:bg-black'
                  : 'left-1 bg-white dark:bg-gray-400'"
              />
            </button>
          </div>

          <!-- 插件描述 -->
          <p
            class="text-sm mb-4 line-clamp-2"
            :class="plugin.enabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'"
          >
            {{ plugin.description || '暂无描述' }}
          </p>

          <!-- 插件信息 -->
          <div class="flex items-center justify-between text-xs text-gray-400 mb-4">
            <span>作者: {{ plugin.author || '未知' }}</span>
            <span class="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
              {{ pluginTypeLabels[plugin.type] }}
            </span>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center justify-end">
            <button
              @click="pluginsStore.removePlugin(plugin.id)"
              class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <div class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
        <Puzzle class="w-10 h-10 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 class="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">暂无插件</h3>
      <p class="text-sm text-gray-400 dark:text-gray-500 mb-6">添加插件来扩展功能</p>
      <Button variant="primary" leftIcon="plus" @click="openAddModal">
        添加插件
      </Button>
    </div>

    <!-- 添加插件模态框 -->
    <Modal :isOpen="isAddModalOpen" title="添加插件" @update:isOpen="isAddModalOpen = $event">
      <!-- 标签页 -->
      <div class="flex border-b border-gray-200 dark:border-gray-800 mb-6 -mt-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="px-4 py-3 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px"
          :class="activeTab === tab.id
            ? 'text-black dark:text-white border-black dark:border-white'
            : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 本地插件 -->
      <div v-if="activeTab === 'local'" class="space-y-4">
        <div
          class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors duration-200"
          :class="{ 'border-black dark:border-white': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleFileDrop"
        >
          <Upload class="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            拖放 .js 或 .ts 文件到此处
          </p>
          <p class="text-xs text-gray-400 mb-4">或点击下方按钮选择文件</p>
          <input
            ref="fileInputRef"
            type="file"
            accept=".js,.ts"
            class="hidden"
            @change="handleFileSelect"
          />
          <Button variant="outline" size="sm" @click="fileInputRef?.click()">
            选择文件
          </Button>
        </div>
      </div>

      <!-- URL 插件 -->
      <div v-if="activeTab === 'url'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            插件 URL
          </label>
          <div class="flex gap-2">
            <input
              v-model="pluginUrl"
              type="url"
              placeholder="https://example.com/plugin.js"
              class="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            <Button
              variant="outline"
              :loading="isFetching"
              @click="fetchPluginFromUrl"
            >
              获取
            </Button>
          </div>
        </div>
      </div>

      <!-- npm 包 -->
      <div v-if="activeTab === 'npm'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            npm 包名称
          </label>
          <div class="flex gap-2">
            <input
              v-model="npmPackage"
              type="text"
              placeholder="flow-music-plugin-example"
              class="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            <Button
              variant="outline"
              :loading="isInstalling"
              @click="installNpmPackage"
            >
              安装
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="isAddModalOpen = false">
          取消
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Puzzle, Trash2, Upload, Plus } from 'lucide-vue-next'
import { usePluginsStore, type Plugin } from '~/stores/plugins'
import Modal from '~/components/common/Modal.vue'
import Button from '~/components/common/Button.vue'

definePageMeta({
  layout: 'default'
})

const pluginsStore = usePluginsStore()

const isAddModalOpen = ref(false)
const activeTab = ref<'local' | 'url' | 'npm'>('local')
const isDragging = ref(false)
const isFetching = ref(false)
const isInstalling = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const pluginUrl = ref('')
const npmPackage = ref('')

const tabs = [
  { id: 'local' as const, label: '本地' },
  { id: 'url' as const, label: 'URL' },
  { id: 'npm' as const, label: 'npm' }
]

const pluginTypeLabels: Record<Plugin['type'], string> = {
  local: '本地',
  url: 'URL',
  npm: 'npm'
}

function openAddModal() {
  isAddModalOpen.value = true
  activeTab.value = 'local'
  pluginUrl.value = ''
  npmPackage.value = ''
}

// 本地文件处理
function handleFileDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && (file.name.endsWith('.js') || file.name.endsWith('.ts'))) {
    processLocalFile(file)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processLocalFile(file)
  }
}

async function processLocalFile(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    const name = file.name.replace(/\.(js|ts)$/, '')
    pluginsStore.addPlugin({
      name,
      version: '1.0.0',
      description: `本地插件: ${file.name}`,
      author: '本地用户',
      enabled: true,
      type: 'local',
      source: file.name
    })
    isAddModalOpen.value = false
  }
  reader.readAsText(file)
}

// URL 获取
async function fetchPluginFromUrl() {
  if (!pluginUrl.value) return
  isFetching.value = true
  try {
    const response = await fetch(pluginUrl.value)
    const text = await response.text()
    const name = new URL(pluginUrl.value).pathname.split('/').pop()?.replace(/\.(js|ts)$/, '') || 'URL插件'
    pluginsStore.addPlugin({
      name,
      version: '1.0.0',
      description: `从 ${pluginUrl.value} 加载的插件`,
      author: '未知',
      enabled: true,
      type: 'url',
      source: pluginUrl.value
    })
    isAddModalOpen.value = false
  } catch (error) {
    console.error('Failed to fetch plugin:', error)
  } finally {
    isFetching.value = false
  }
}

// npm 安装
async function installNpmPackage() {
  if (!npmPackage.value) return
  isInstalling.value = true
  try {
    // 模拟安装过程
    await new Promise(resolve => setTimeout(resolve, 1000))
    pluginsStore.addPlugin({
      name: npmPackage.value,
      version: '1.0.0',
      description: `npm 包: ${npmPackage.value}`,
      author: 'npm',
      enabled: true,
      type: 'npm',
      source: npmPackage.value
    })
    isAddModalOpen.value = false
  } catch (error) {
    console.error('Failed to install npm package:', error)
  } finally {
    isInstalling.value = false
  }
}

onMounted(() => {
  pluginsStore.loadPlugins()
})
</script>

<style scoped>
.plugin-list-enter-active,
.plugin-list-leave-active {
  transition: all 0.3s ease;
}
.plugin-list-enter-from,
.plugin-list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.plugin-list-move {
  transition: transform 0.3s ease;
}
</style>