<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">脚本日志</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">查看脚本调用服务端动作后的执行结果。</p>
      </div>
      <Button variant="outline" @click="loadLogs">刷新日志</Button>
    </div>

    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">脚本</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">动作</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">状态</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">消息</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">时间</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-for="log in logs" :key="log.id">
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ scriptName(log.scriptId) }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ log.action }}</td>
            <td class="px-4 py-3">
              <span :class="log.status === 'success'
                ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'rounded-full bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300'">
                {{ log.status === 'success' ? '成功' : '失败' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ log.message }}</td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ formatDate(log.createdAt) }}</td>
          </tr>
          <tr v-if="logs.length === 0">
            <td colspan="5" class="px-4 py-10 text-center text-gray-500 dark:text-gray-400">暂无脚本日志</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from '~/components/common/Button.vue'
import { useScriptsStore } from '~/stores/scripts'
import type { ScriptExecutionLog } from '~/types/scripts'

definePageMeta({ layout: 'default' })

const store = useScriptsStore()
const logs = ref<ScriptExecutionLog[]>([])

function scriptName(scriptId: string) {
  return store.getScript(scriptId)?.name || scriptId
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}

async function loadLogs() {
  logs.value = await $fetch<ScriptExecutionLog[]>('/api/scripts/logs')
}

onMounted(() => {
  store.loadScripts()
  loadLogs()
})
</script>
