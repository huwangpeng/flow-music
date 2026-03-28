<template>
  <div class="space-y-6 pb-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">插件</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">上传、安装并管理插件包。</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <Button variant="outline" :leftIcon="Upload" @click="openAddModal">
          上传插件包
        </Button>
        <Button variant="secondary" @click="installTestPlugin">
          安装测试脚本
        </Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900">
        <p class="text-sm text-gray-500 dark:text-gray-400">已接入脚本</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{{ scriptsStore.scripts.length }}</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900">
        <p class="text-sm text-gray-500 dark:text-gray-400">已启用脚本</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{{ enabledScriptCount }}</p>
      </div>
    </div>

    <div>
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">插件包</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">管理已接入脚本。</p>
          </div>
        </div>

        <div v-if="scriptsStore.scripts.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Puzzle class="h-8 w-8 text-gray-400" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">暂无脚本</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">上传 zip 插件包，或先安装测试脚本。</p>
          <div class="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" :leftIcon="Upload" @click="openAddModal">
              上传插件包
            </Button>
            <Button variant="secondary" @click="installTestPlugin">
              安装测试脚本
            </Button>
          </div>
        </div>

        <TransitionGroup v-else name="script-card" tag="div" class="space-y-4">
          <article
            v-for="script in scriptsStore.scripts"
            :key="script.id"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div
                  class="flex h-11 w-11 items-center justify-center rounded-xl"
                  :class="script.enabled ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'"
                >
                  <Puzzle class="h-5 w-5" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">{{ script.name }}</h3>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">v{{ script.version }} · {{ pluginTypeLabels[script.sourceType] }}</p>
                  <p class="mt-2 text-sm text-gray-600 line-clamp-2 dark:text-gray-400">{{ script.description || '暂无描述' }}</p>
                </div>
              </div>

              <button
                @click="scriptsStore.toggleScript(script.id)"
                :aria-label="script.enabled ? `停用脚本 ${script.name}` : `启用脚本 ${script.name}`"
                class="relative h-6 w-11 rounded-full transition-colors"
                :class="script.enabled ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'"
              >
                <span
                  class="absolute top-1 h-4 w-4 rounded-full transition-all"
                  :class="script.enabled ? 'left-6 bg-white dark:bg-black' : 'left-1 bg-white'"
                />
              </button>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <NuxtLink
                  v-if="script.configPage"
                  :to="`/scripts/config/${script.id}`"
                  class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Settings class="h-3 w-3" />
                  配置
                </NuxtLink>
                <NuxtLink
                  v-if="script.pages?.length"
                  :to="`/scripts/pages/${script.id}/${script.pages[0].id}`"
                  class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Plus class="h-3 w-3" />
                  页面
                </NuxtLink>
                <button
                  v-if="script.id === testPluginId"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  @click="openTestPage(script.id)"
                >
                  <Zap class="h-3 w-3" />
                  测试
                </button>
              </div>
              <button
                @click="scriptsStore.removeScript(script.id)"
                class="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                title="删除脚本"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </article>
        </TransitionGroup>
      </section>
    </div>

    <Modal :isOpen="isAddModalOpen" title="上传插件包" @update:isOpen="isAddModalOpen = $event">
      <div class="mb-6 -mt-2 flex border-b border-gray-200 dark:border-gray-800">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200"
          :class="activeTab === tab.id
            ? 'border-black text-black dark:border-white dark:text-white'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'local'" class="space-y-4">
        <div
          class="rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 p-8 text-center transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600 dark:hover:bg-gray-900"
          :class="{ 'border-black dark:border-white': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleFileDrop"
        >
          <Upload class="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p class="mb-2 text-sm text-gray-700 dark:text-gray-300">拖入 .flow-script.zip 或 .zip 插件包</p>
          <p class="mb-4 text-xs text-gray-400">插件包中可包含 manifest、页面资源和脚本入口</p>
          <input
            ref="fileInputRef"
            type="file"
            accept=".zip,.flow-script.zip"
            class="hidden"
            @change="handleFileSelect"
          />
          <Button variant="outline" size="sm" @click="fileInputRef?.click()">
            选择文件
          </Button>
        </div>
      </div>

      <div v-if="activeTab === 'url'" class="space-y-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          插件包地址
        </label>
        <div class="flex gap-2">
          <input
            v-model="pluginUrl"
            type="url"
            placeholder="https://example.com/plugin.flow-script.zip"
            class="flex-1 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
          />
          <Button variant="outline" :loading="isFetching" @click="fetchPluginFromUrl">
            获取
          </Button>
        </div>
      </div>

      <div v-if="activeTab === 'npm'" class="space-y-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          npm 包名称
        </label>
        <div class="flex gap-2">
          <input
            v-model="npmPackage"
            type="text"
            placeholder="flow-music-plugin-example"
            class="flex-1 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
          />
          <Button variant="outline" :loading="isInstalling" @click="installNpmPackage">
            安装
          </Button>
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

<style scoped>
.script-card-enter-active,
.script-card-leave-active {
  transition: all 0.28s ease;
}

.script-card-enter-from,
.script-card-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.script-card-move {
  transition: transform 0.28s ease;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Puzzle, Settings, Trash2, Upload, Zap } from 'lucide-vue-next'
import Button from '~/components/common/Button.vue'
import Modal from '~/components/common/Modal.vue'
import { useScriptsStore } from '~/stores/scripts'
import type { ScriptManifest } from '~/types/scripts'
import type { ScriptPackageManifest } from '~/types/script-packages'
import { useScriptPackageUpload } from '~/composables/useScriptPackageUpload'

definePageMeta({
  layout: 'default'
})

const router = useRouter()
const scriptsStore = useScriptsStore()
const { installPackage } = useScriptPackageUpload()

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

const pluginTypeLabels = {
  local: '本地',
  url: 'URL',
  npm: 'npm',
  store: '商店'
} as const

const testPluginId = 'script-runtime-tester'

function buildManifest(name: string, source: string, sourceType: 'local' | 'url' | 'npm', description: string): ScriptManifest {
  return {
    id: `script-${Date.now()}`,
    name,
    version: '1.0.0',
    description,
    author: '本地用户',
    source,
    sourceType,
    permissions: ['runtime:execute', 'ui:config'],
    configPage: {
      title: `${name} 配置`,
      description: '脚本可在此声明自己的配置项和敏感参数。',
      fields: [
        {
          key: 'enabled',
          label: '启用脚本能力',
          type: 'boolean',
          default: true,
          placeholder: '打开后允许脚本执行'
        }
      ]
    },
    pages: [
      {
        id: 'dashboard',
        title: `${name} 面板`,
        path: `/scripts/pages/${name}/dashboard`,
        entry: 'dashboard',
        description: '脚本注册的默认自定义页面',
        visibleInSidebar: false
      }
    ],
    actions: [
      {
        id: 'scripts.describeActions',
        label: '查看可用动作',
        description: '用于调试脚本当前声明的宿主动作',
        permission: 'runtime:execute'
      }
    ],
    flowNodes: []
  }
}

function buildTestPluginManifest(): ScriptManifest {
  return {
    id: testPluginId,
    name: '测试脚本',
    version: '1.0.0',
    description: '用于验证配置页、页面与日志能力。',
    author: 'Flow Music',
    source: 'builtin:test-script',
    sourceType: 'local',
    permissions: ['runtime:execute', 'ui:config', 'ui:page'],
    configPage: {
      title: '测试脚本配置',
      fields: [
        {
          key: 'title',
          label: '标题',
          type: 'text',
          default: '测试脚本'
        }
      ]
    },
    pages: [
      {
        id: 'dashboard',
        title: '测试页面',
        path: `/scripts/pages/${testPluginId}/dashboard`,
        entry: 'dashboard'
      }
    ],
    actions: [
      {
        id: 'logs.query',
        label: '查看日志',
        permission: 'runtime:execute'
      }
    ],
    flowNodes: []
  }
}

const testPluginCode = `;(async function () {
  const response = await FlowAPI.scripts.callAction(ScriptContext.meta.id, 'logs.query', {
    permissions: ScriptContext.permissions,
    limit: 5
  })
  console.log('[TestScript] logs', response)
})()`

const enabledScriptCount = computed(() => scriptsStore.scripts.filter(script => script.enabled).length)
function openAddModal() {
  isAddModalOpen.value = true
  activeTab.value = 'local'
  pluginUrl.value = ''
  npmPackage.value = ''
}

function installTestPlugin() {
  scriptsStore.registerManifest(buildTestPluginManifest(), testPluginCode)
}

function openTestPage(scriptId: string) {
  router.push(`/scripts/pages/${scriptId}/dashboard`)
}

function handleFileDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file && /\.(zip|flow-script\.zip)$/i.test(file.name)) {
    processLocalFile(file)
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processLocalFile(file)
  }
}

async function processLocalFile(file: File) {
  const result = await installPackage(file)
  if (result.success && result.data) {
    scriptsStore.registerPackageManifest(result.data.manifest as ScriptPackageManifest)
  }
  isAddModalOpen.value = false
}

async function fetchPluginFromUrl() {
  if (!pluginUrl.value) return

  isFetching.value = true
  try {
    const response = await fetch(pluginUrl.value)
    const blob = await response.blob()
    const fileName = new URL(pluginUrl.value).pathname.split('/').pop() || 'remote-plugin.flow-script.zip'
    const file = new File([blob], fileName, { type: blob.type || 'application/zip' })
    const result = await installPackage(file)
    if (result.success && result.data) {
      scriptsStore.registerPackageManifest(result.data.manifest as ScriptPackageManifest)
    }
    isAddModalOpen.value = false
  } catch (error) {
    console.error('Failed to fetch plugin:', error)
  } finally {
    isFetching.value = false
  }
}

async function installNpmPackage() {
  if (!npmPackage.value) return

  isInstalling.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const manifest = buildManifest(npmPackage.value, npmPackage.value, 'npm', `npm 脚本包：${npmPackage.value}`)
    scriptsStore.registerManifest(manifest, `console.log('Installed package ${npmPackage.value}')`)
    isAddModalOpen.value = false
  } catch (error) {
    console.error('Failed to install npm package:', error)
  } finally {
    isInstalling.value = false
  }
}

onMounted(() => {
  scriptsStore.loadScripts()
  scriptsStore.restoreInstalledPackages()
})
</script>
