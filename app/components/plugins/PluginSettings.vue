<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-6">插件设置</h2>
    
    <div v-if="!plugin" class="text-gray-500">
      请选择一个插件进行配置
    </div>
    
    <div v-else>
      <!-- 插件信息 -->
      <div class="bg-card rounded-lg p-6 mb-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold">{{ plugin.name }}</h3>
            <p class="text-sm text-gray-500">v{{ plugin.version }} by {{ plugin.author }}</p>
          </div>
          <div class="flex items-center gap-2">
            <Badge :variant="plugin.enabled ? 'default' : 'secondary'">
              {{ plugin.enabled ? '已启用' : '已禁用' }}
            </Badge>
            <Badge v-if="hasCoreModificationPermission" variant="destructive">
              ⚠️ 核心修改
            </Badge>
          </div>
        </div>
        <p class="text-gray-600 dark:text-gray-400">{{ plugin.description }}</p>
      </div>

      <!-- 核心修改警告 -->
      <div v-if="hasCoreModificationPermission" class="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h4 class="font-semibold text-destructive mb-2">高风险插件警告</h4>
            <p class="text-sm text-destructive/80">
              此插件可以修改应用核心逻辑，可能存在安全风险。请确保您完全信任插件作者。
            </p>
            <div class="mt-3 flex gap-2">
              <Button variant="destructive-outline" size="sm" @click="showDetails = !showDetails">
                {{ showDetails ? '隐藏详情' : '查看详情' }}
              </Button>
            </div>
            <div v-if="showDetails" class="mt-3 text-sm text-destructive/80">
              <p>• 此插件可以修改播放器行为</p>
              <p>• 此插件可以注入自定义组件</p>
              <p>• 此插件可以注册中间件</p>
              <p>• 此插件可以钩用系统事件</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 设置表单 -->
      <div v-if="plugin.settingsSchema && plugin.settingsSchema.length > 0" class="space-y-4">
        <h4 class="font-semibold mb-4">插件配置</h4>
        
        <div v-for="field in plugin.settingsSchema" :key="field.key" class="space-y-2">
          <!-- 文本输入 -->
          <div v-if="field.type === 'text'">
            <Label :for="field.key">{{ field.label }}</Label>
            <Input
              :id="field.key"
              v-model="localSettings[field.key]"
              type="text"
              @change="saveSettings"
            />
          </div>
          
          <!-- 密码输入 -->
          <div v-else-if="field.type === 'password'">
            <Label :for="field.key">{{ field.label }}</Label>
            <Input
              :id="field.key"
              v-model="localSettings[field.key]"
              type="password"
              @change="saveSettings"
            />
          </div>
          
          <!-- 数字输入 -->
          <div v-else-if="field.type === 'number'">
            <Label :for="field.key">{{ field.label }}</Label>
            <Input
              :id="field.key"
              v-model.number="localSettings[field.key]"
              type="number"
              @change="saveSettings"
            />
          </div>
          
          <!-- 布尔开关 -->
          <div v-else-if="field.type === 'boolean'" class="flex items-center justify-between">
            <Label :for="field.key">{{ field.label }}</Label>
            <Switch
              :id="field.key"
              :checked="localSettings[field.key]"
              @update:checked="localSettings[field.key] = $event; saveSettings()"
            />
          </div>
          
          <!-- 下拉选择 -->
          <div v-else-if="field.type === 'select'">
            <Label :for="field.key">{{ field.label }}</Label>
            <Select v-model="localSettings[field.key]" @update:model-value="saveSettings">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in field.options"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- 无设置项 -->
      <div v-else class="text-gray-500 text-center py-8">
        此插件没有可配置的设置项
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2 mt-6 pt-6 border-t">
        <Button
          :variant="plugin.enabled ? 'destructive' : 'default'"
          @click="togglePlugin"
        >
          {{ plugin.enabled ? '禁用插件' : '启用插件' }}
        </Button>
        <Button variant="outline" @click="resetSettings">
          重置设置
        </Button>
        <Button variant="destructive-outline" @click="removePlugin">
          卸载插件
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePluginsStore } from '~/stores/plugins'
import type { LocalPlugin } from '~/utils/plugins/plugin-types'
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  pluginId?: string
}>()

const store = usePluginsStore()
const showDetails = ref(false)

const plugin = computed(() => {
  if (!props.pluginId) return null
  return store.plugins.find(p => p.id === props.pluginId) || null
})

const hasCoreModificationPermission = computed(() => {
  return plugin.value?.permissions?.includes('core-modification')
})

const localSettings = ref<Record<string, any>>({})

watch(() => plugin.value, (newPlugin) => {
  if (newPlugin) {
    localSettings.value = { ...newPlugin.settings }
  }
}, { immediate: true })

function saveSettings() {
  if (!plugin.value) return
  const p = store.plugins.find(p => p.id === plugin.value!.id)
  if (p) {
    p.settings = { ...localSettings.value }
    store.savePlugins()
  }
}

function resetSettings() {
  if (!plugin.value) return
  const defaultSettings: Record<string, any> = {}
  if (plugin.value.settingsSchema) {
    for (const field of plugin.value.settingsSchema) {
      if (field.default !== undefined) {
        defaultSettings[field.key] = field.default
      }
    }
  }
  localSettings.value = defaultSettings
  saveSettings()
}

function togglePlugin() {
  if (!plugin.value) return
  store.togglePlugin(plugin.value.id)
}

function removePlugin() {
  if (!plugin.value) return
  if (confirm(`确定要卸载插件 "${plugin.value.name}" 吗？`)) {
    store.removePlugin(plugin.value.id)
  }
}
</script>
