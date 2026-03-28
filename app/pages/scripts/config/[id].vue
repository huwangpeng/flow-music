<template>
  <div class="max-w-3xl mx-auto space-y-6 py-8">
    <div class="flex items-center space-x-4">
      <NuxtLink to="/scripts" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors text-gray-500">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">脚本配置</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">{{ script?.name }}</p>
      </div>
    </div>

    <div v-if="!script" class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">未找到脚本</p>
    </div>

    <div v-else-if="!script.configPage" class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Settings class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">此脚本没有配置页面</h3>
      <p class="text-gray-500 dark:text-gray-400">该脚本无需额外配置</p>
    </div>

    <div v-else class="space-y-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ script.configPage.title }}</h2>
            <p v-if="script.configPage.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ script.configPage.description }}
            </p>
          </div>
          <div :class="[
            'px-3 py-1 rounded-full text-xs font-medium',
            script.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          ]">
            {{ script.enabled ? '已启用' : '已禁用' }}
          </div>
        </div>

        <div class="space-y-6">
          <div v-for="field in script.configPage.fields" :key="field.key" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ field.label }}
              <span v-if="field.required" class="text-red-500 ml-1">*</span>
            </label>

            <input
              v-if="field.type === 'text' || field.type === 'password'"
              :type="field.type"
              :value="localSettings[field.key]"
              @input="updateSetting(field.key, ($event.target as HTMLInputElement).value)"
              :placeholder="field.placeholder"
              class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-shadow"
            />

            <textarea
              v-else-if="field.type === 'textarea'"
              :value="localSettings[field.key]"
              @input="updateSetting(field.key, ($event.target as HTMLTextAreaElement).value)"
              :placeholder="field.placeholder"
              rows="4"
              class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-shadow resize-none"
            />

            <input
              v-else-if="field.type === 'number'"
              type="number"
              :value="localSettings[field.key]"
              @input="updateSetting(field.key, ($event.target as HTMLInputElement).valueAsNumber)"
              :placeholder="field.placeholder"
              class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-shadow"
            />

            <select
              v-else-if="field.type === 'select'"
              :value="localSettings[field.key]"
              @change="updateSetting(field.key, ($event.target as HTMLSelectElement).value)"
              class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-shadow"
            >
              <option value="" disabled>请选择</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <label v-else-if="field.type === 'boolean'" class="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                :checked="localSettings[field.key]"
                @change="updateSetting(field.key, ($event.target as HTMLInputElement).checked)"
                class="w-4 h-4 text-black border-gray-300 rounded focus:ring-black dark:focus:ring-white dark:border-gray-700"
              />
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ field.placeholder }}</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-800 mt-6">
          <button
            @click="resetSettings"
            class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            重置
          </button>
          <button
            @click="saveSettings"
            class="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
          >
            保存配置
          </button>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 class="font-semibold text-gray-900 dark:text-white mb-4">脚本信息</h3>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">版本</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ script.version }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">作者</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ script.author }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">来源</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ script.source }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">类型</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ script.sourceType }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">权限</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ script.permissions.join('，') || '无' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">自定义页面</dt>
            <dd class="font-medium text-gray-900 dark:text-white">{{ script.pages?.length || 0 }} 个</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Settings } from 'lucide-vue-next'
import { useScriptsStore, type ScriptDefinition } from '~/stores/scripts'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const store = useScriptsStore()

const script = computed(() => store.getScript(route.params.id as string))
const localSettings = ref<Record<string, any>>({})

watch(script, (newScript) => {
  if (newScript) {
    localSettings.value = { ...newScript.settings }
  }
}, { immediate: true })

function updateSetting(key: string, value: any) {
  localSettings.value[key] = value
}

function saveSettings() {
  if (!script.value) return
  store.updateScriptSettings(script.value.id, localSettings.value)
  alert('配置已保存')
}

function resetSettings() {
  if (!script.value?.configPage) return
  const defaults: Record<string, any> = {}
  for (const field of script.value.configPage.fields) {
    if (field.default !== undefined) {
      defaults[field.key] = field.default
    }
  }
  localSettings.value = defaults
}

onMounted(() => {
  if (!script.value) {
    router.push('/scripts')
  }
})
</script>
