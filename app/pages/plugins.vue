<template>
  <div class="space-y-8 pb-12">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">插件中心</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">发现并安装社区插件或管理已安装的拓展功能</p>
      </div>
      <button
        @click="store.fetchStorePlugins"
        class="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
        :disabled="store.isFetchingStore"
      >
        <RefreshCw :class="['w-4 h-4', { 'animate-spin': store.isFetchingStore }]" />
        <span>刷新商店</span>
      </button>
    </div>

    <!-- 已安装插件 -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <Box class="w-5 h-5 mr-2" /> 
        已安装插件 ({{ store.plugins.length }})
      </h2>
      <div v-if="store.plugins.length === 0" class="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-500">
        无已安装插件
      </div>
      <div v-else class="grid grid-cols-1 gap-4">
        <div 
          v-for="plugin in store.plugins" 
          :key="plugin.id"
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl relative overflow-hidden transition-all duration-300"
        >
          <div class="p-6 flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-bold text-lg text-gray-900 dark:text-white flex items-center">
                {{ plugin.name }}
                <span class="ml-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">v{{ plugin.version }}</span>
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ plugin.description }}</p>
              <div class="flex items-center mt-3 space-x-4">
                <span class="text-xs text-gray-400">作者: {{ plugin.author }}</span>
                <button 
                  v-if="plugin.settingsSchema && plugin.settingsSchema.length > 0"
                  @click="toggleSettingsPanel(plugin.id)"
                  class="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center focus:outline-none"
                >
                  <Settings class="w-3 h-3 mr-1" />
                  配置参数
                </button>
              </div>
            </div>
            <div class="pl-4 flex flex-col items-end space-y-3">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" :checked="plugin.enabled" @change="store.togglePlugin(plugin.id)">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
              <button @click="store.removePlugin(plugin.id)" class="text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors">
                卸载
              </button>
            </div>
          </div>
          
          <!-- 插件内联设置面板 -->
          <div 
            v-show="openSettingsMap[plugin.id]" 
            class="px-6 py-5 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4"
          >
            <div v-for="field in plugin.settingsSchema" :key="field.key" class="space-y-1.5">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ field.label }}</label>
              
              <!-- Boolean Toggle -->
              <label v-if="field.type === 'boolean'" class="relative inline-flex items-center cursor-pointer mt-1">
                <input 
                  type="checkbox" 
                  class="sr-only peer" 
                  :checked="plugin.settings[field.key]"
                  @change="e => updatePluginSetting(plugin.id, field.key, (e.target as HTMLInputElement).checked)"
                >
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
              </label>
              
              <!-- Input Text/Password/Number -->
              <input 
                v-else-if="['text', 'password', 'number'].includes(field.type)"
                :type="field.type" 
                :value="plugin.settings[field.key]"
                @change="e => updatePluginSetting(plugin.id, field.key, field.type === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value)"
                class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
              />
              
              <!-- Select -->
              <select
                v-else-if="field.type === 'select'"
                :value="plugin.settings[field.key]"
                @change="e => updatePluginSetting(plugin.id, field.key, (e.target as HTMLSelectElement).value)"
                class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
              >
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
            
            <div class="col-span-full pt-2">
              <span class="text-xs text-gray-400 flex items-center"><Info class="w-3 h-3 mr-1" /> 更改会自动保存。某些设置可能需要重启应用才能生效。</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-gray-200 dark:border-gray-800" />

    <!-- 插件商店 -->
    <section>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <Store class="w-5 h-5 mr-2" />
        插件商店 (GitHub)
      </h2>
      <div v-if="store.isFetchingStore" class="p-8 text-center text-gray-500">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2" />
        正在连接 GitHub...
      </div>
      <div v-else-if="store.storePlugins.length === 0" class="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-500">
        商店为空，请点击刷新。
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="remote in store.storePlugins" 
          :key="remote.id"
          class="p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:shadow-lg transition-all flex flex-col h-[180px]"
        >
          <div class="flex items-center space-x-2 mb-3">
            <div class="w-8 h-8 rounded bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {{ remote.name.substring(0, 2).toUpperCase() }}
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white leading-tight">{{ remote.name }}</h3>
              <p class="text-xs text-gray-500 font-mono">v{{ remote.version }}</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 h-10">{{ remote.description }}</p>
          
          <div class="flex items-center justify-between mt-auto">
            <span class="text-xs text-gray-400">By {{ remote.author }}</span>
            <button
              v-if="isInstalled(remote.id)"
              disabled
              class="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400 rounded cursor-not-allowed"
            >
              已安装
            </button>
            <button
              v-else
              @click="install(remote)"
              class="px-3 py-1.5 text-xs font-bold bg-black dark:bg-white text-white dark:text-black rounded hover:scale-105 transition-transform"
            >
              一键安装
            </button>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Store, Box, RefreshCw, Settings, Info } from 'lucide-vue-next'
import { usePluginsStore, type RemotePlugin } from '~/stores/plugins'

definePageMeta({ layout: 'default' })

const store = usePluginsStore()

const openSettingsMap = ref<Record<string, boolean>>({})

function toggleSettingsPanel(pluginId: string) {
  openSettingsMap.value[pluginId] = !openSettingsMap.value[pluginId]
}

function updatePluginSetting(pluginId: string, key: string, value: any) {
  const plugin = store.plugins.find(p => p.id === pluginId)
  if (plugin) {
    plugin.settings[key] = value
    store.savePlugins()
  }
}

function isInstalled(id: string) {
  return store.plugins.some(p => p.id === id)
}

async function install(remote: RemotePlugin) {
  const success = await store.installPlugin(remote)
  if (success) {
    alert(`插件 [${remote.name}] 安装成功！`)
  } else {
    alert('插件安装失败。请检查网络连接。')
  }
}

onMounted(() => {
  if (store.storePlugins.length === 0) {
    store.fetchStorePlugins()
  }
})
</script>
