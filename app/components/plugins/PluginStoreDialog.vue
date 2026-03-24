<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-4xl">
      <DialogHeader>
        <DialogTitle>插件商店</DialogTitle>
        <DialogDescription>
          浏览和安装插件来扩展应用功能
        </DialogDescription>
      </DialogHeader>

      <div class="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div
          v-for="plugin in store.storePlugins"
          :key="plugin.id"
          class="border rounded-lg p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-lg">{{ plugin.name }}</h3>
                <Badge variant="outline">v{{ plugin.version }}</Badge>
                <Badge v-if="plugin.permissions.includes('core-modification')" variant="destructive">
                  <AlertTriangle class="w-3 h-3 mr-1" />
                  核心修改
                </Badge>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {{ plugin.description }}
              </p>
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span>作者：{{ plugin.author }}</span>
                <span>权限：{{ plugin.permissions.length }}</span>
              </div>
              
              <!-- 权限列表 -->
              <div class="mt-3 flex flex-wrap gap-2">
                <Badge
                  v-for="perm in plugin.permissions"
                  :key="perm"
                  :variant="perm === 'core-modification' ? 'destructive' : 'secondary'"
                >
                  {{ getPermissionLabel(perm) }}
                </Badge>
              </div>
              
              <!-- 设置预览 -->
              <div v-if="plugin.settingsSchema && plugin.settingsSchema.length > 0" class="mt-3 text-sm">
                <span class="text-gray-500">可配置项：{{ plugin.settingsSchema.length }}</span>
              </div>
            </div>
            
            <div class="ml-4">
              <Button
                v-if="!isInstalled(plugin.id)"
                @click="installPlugin(plugin)"
                :disabled="isInstalling"
              >
                {{ isInstalling ? '安装中...' : '安装' }}
              </Button>
              <Button v-else variant="outline" disabled>
                已安装
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="isOpen = false">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePluginsStore } from '~/stores/plugins'
import type { RemotePlugin } from '~/utils/plugins/plugin-types'
import { AlertTriangle } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/components/ui/dialog'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = usePluginsStore()
const isInstalling = ref(false)

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

watch(() => props.open, async (newVal) => {
  if (newVal) {
    await store.fetchStorePlugins()
  }
})

function isInstalled(pluginId: string): boolean {
  return store.plugins.some(p => p.id === pluginId)
}

function getPermissionLabel(perm: string): string {
  const labels: Record<string, string> = {
    automation: '自动化',
    storage: '存储访问',
    network: '网络访问',
    notification: '通知',
    clipboard: '剪贴板',
    'core-modification': '核心修改'
  }
  return labels[perm] || perm
}

async function installPlugin(plugin: RemotePlugin) {
  isInstalling.value = true
  try {
    await store.installPlugin(plugin)
  } catch (error) {
    console.error('Failed to install plugin:', error)
  } finally {
    isInstalling.value = false
  }
}
</script>
