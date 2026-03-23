<template>
  <div class="space-y-8 pb-12">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">管理你的音乐库和应用偏好</p>
    </div>

    <!-- 常规设置 -->
    <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">常规选项</h2>
      </div>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">自动补全标签</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">导入文件时自动提取文件名信息并查询元数据</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer group">
            <input type="checkbox" class="sr-only peer" :checked="store.settings.autoTag" @change="e => store.updateSettings({ autoTag: (e.target as HTMLInputElement).checked })">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 border-2 border-transparent transition-all peer-checked:bg-black dark:peer-checked:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white dark:peer-checked:after:bg-black select-none"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">自动获取封面</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">歌曲缺少封面时尝试从网络获取</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer group">
            <input type="checkbox" class="sr-only peer" :checked="store.settings.autoCover" @change="e => store.updateSettings({ autoCover: (e.target as HTMLInputElement).checked })">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 border-2 border-transparent transition-all peer-checked:bg-black dark:peer-checked:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white dark:peer-checked:after:bg-black select-none"></div>
          </label>
        </div>
      </div>
    </section>

    <!-- 缓存与存储 -->
    <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">缓存与存储</h2>
      </div>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">清理本地缓存</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">清除已缓存的图片和临时文件，释放空间</p>
          </div>
          <button 
            @click="clearCache"
            :disabled="isClearing"
            class="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
          >
            <Loader2 v-if="isClearing" class="w-4 h-4 mr-2 animate-spin text-gray-500" />
            <span v-else>清理缓存</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 高级 API 配置 -->
    <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">API 密钥 (可选)</h2>
      </div>
      <div class="p-6 space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">网易云音乐 API</label>
          <input 
            type="password" 
            :value="store.settings.apiKeys?.neteaseMusic || ''"
            @change="e => updateApiKey('neteaseMusic', (e.target as HTMLInputElement).value)"
            placeholder="留空以使用默认公共节点" 
            class="w-full max-w-md px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OpenAI API (智能重命名)</label>
          <input 
            type="password" 
            :value="store.settings.apiKeys?.openai || ''"
            @change="e => updateApiKey('openai', (e.target as HTMLInputElement).value)"
            placeholder="sk-..." 
            class="w-full max-w-md px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all outline-none"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const store = useSettingsStore()
const isClearing = ref(false)

function updateApiKey(key: 'neteaseMusic' | 'openai', val: string) {
  const newApiKeys = { ...store.settings.apiKeys, [key]: val }
  store.updateSettings({ apiKeys: newApiKeys })
}

async function clearCache() {
  if (isClearing.value) return
  isClearing.value = true
  await store.clearCache()
  isClearing.value = false
  alert('缓存清理成功！')
}
</script>
