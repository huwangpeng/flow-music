<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ pageDescription }}</p>
      </div>
      <NuxtLink
        to="/scripts"
        class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        返回脚本中心
      </NuxtLink>
    </div>

    <iframe
      v-if="iframeSrc"
      :src="iframeSrc"
      class="h-[calc(100vh-240px)] w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      sandbox="allow-scripts allow-forms"
    />

    <ScriptCustomPageRenderer
      v-else
      :title="pageTitle"
      :description="pageDescription"
      :sections="sections"
      @action="handleAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ScriptCustomPageRenderer from '~/components/scripts/ScriptCustomPageRenderer.vue'
import { useScriptsStore } from '~/stores/scripts'
import type { ScriptPageAssetDefinition } from '~/types/script-packages'

definePageMeta({ layout: 'default' })

const route = useRoute()
const store = useScriptsStore()

const script = computed(() => store.getScript(route.params.scriptId as string))
const page = computed(() => script.value?.pages?.find(item => item.id === route.params.pageId))

const pageTitle = computed(() => page.value?.title || '脚本页面')
const pageDescription = computed(() => page.value?.description || '当前脚本注册的自定义页面。')

const iframeSrc = computed(() => {
  const currentScript = script.value
  const currentPage = page.value as ScriptPageAssetDefinition | undefined
  if (!currentScript || !currentPage?.entryHtml || currentScript.sourceType !== 'package') return ''
  return `/api/scripts/packages/${currentScript.id}/${currentScript.version}/${currentPage.entryHtml}`
})

const sections = computed(() => {
  if (!script.value) return []
  return [
    {
      id: 'meta',
      title: '脚本信息',
      description: '此页面由脚本声明并由宿主渲染。',
      fields: [
        { key: 'script', label: '脚本名称', value: script.value.name },
        { key: 'version', label: '脚本版本', value: script.value.version },
        { key: 'entry', label: '页面入口', value: page.value?.entry || '未声明' },
        { key: 'path', label: '访问路径', value: page.value?.path || '未声明' }
      ]
    },
    {
      id: 'capabilities',
      title: '权限与能力',
      description: '此脚本可用的权限范围。',
      actionLabel: '查看配置',
      fields: (script.value.permissions || []).map(permission => ({
        key: permission,
        label: permission,
        value: '已授权'
      }))
    }
  ]
})

function handleAction(sectionId: string) {
  if (sectionId === 'capabilities' && script.value) {
    navigateTo(`/scripts/config/${script.value.id}`)
  }
}
</script>
