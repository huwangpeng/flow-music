<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">自动化</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">创建自动化流程来管理音乐</p>
      </div>
      <button
        @click="createNew"
        class="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
      >
        <Plus class="w-5 h-5" />
        <span>创建规则</span>
      </button>
    </div>

    <div v-if="store.flows.length === 0" class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Zap class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无自动化规则</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">创建你的第一个自动化流水线规则，解放双手</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-for="flow in store.flows"
        :key="flow.id"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              flow.enabled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            ]">
              <Zap class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">{{ flow.name }}</h3>
              <p class="text-xs text-gray-500 mt-1">{{ flow.nodes.length }} 个节点, {{ flow.edges.length }} 条连接</p>
            </div>
          </div>
          <div class="flex items-center space-x-3 sm:space-x-4">
            <button
              @click="store.toggleFlow(flow.id)"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                flow.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full transition-transform',
                  flow.enabled ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white'
                ]"
              />
            </button>
            <div class="flex items-center border-l pl-3 sm:pl-4 border-gray-200 dark:border-gray-800 space-x-2">
              <NuxtLink
                :to="`/automation/${flow.id}`"
                class="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="编辑流程图"
              >
                <Pencil class="w-4 h-4" />
              </NuxtLink>
              <button
                @click="store.deleteFlow(flow.id)"
                class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="删除"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Zap, Pencil, Trash2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAutomationStore } from '~/stores/automation'

definePageMeta({ layout: 'default' })

const store = useAutomationStore()
const router = useRouter()

function createNew() {
  const id = store.addFlow()
  router.push(`/automation/${id}`)
}
</script>
