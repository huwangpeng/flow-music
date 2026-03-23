<template>
  <div class="h-[calc(100vh-8rem)] flex flex-col space-y-4">
    <div class="flex items-center justify-between flex-shrink-0">
      <div class="flex items-center space-x-4">
        <NuxtLink to="/automation" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors text-gray-500">
          <ArrowLeft class="w-5 h-5" />
        </NuxtLink>
        <div>
          <div class="flex items-center space-x-2" v-if="currentFlow">
            <h1 v-if="!isRenaming" class="text-2xl font-bold text-gray-900 dark:text-white">{{ currentFlow.name }}</h1>
            <input 
              v-else 
              v-model="editName" 
              @blur="finishRename"
              @keyup.enter="finishRename"
              class="text-2xl font-bold bg-transparent border-b border-gray-400 focus:outline-none focus:border-black dark:text-white dark:focus:border-white w-48"
              autofocus
            />
            <button @click="startRename" v-if="!isRenaming" class="text-gray-400 hover:text-black dark:hover:text-white">
              <Pencil class="w-4 h-4" />
            </button>
          </div>
          <p class="text-gray-500 dark:text-gray-400 mt-1">拖拽节点来构建您的自动化流程</p>
        </div>
      </div>
      <div class="flex space-x-3">
        <button
          @click="saveFlow"
          class="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
        >
          <Save class="w-4 h-4" />
          <span>保存流程</span>
        </button>
      </div>
    </div>

    <div class="flex-1 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex bg-white dark:bg-gray-900 relative">
      <!-- 侧边栏：可用节点 -->
      <div class="w-64 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col space-y-6 overflow-y-auto bg-gray-50 dark:bg-black/50">
        <div>
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">触发条件库</h3>
          <div class="space-y-2">
            <div 
              v-for="trigger in availableTriggers" 
              :key="trigger.id"
              draggable="true"
              @dragstart="onDragStart($event, 'trigger', trigger.id, trigger.label)"
              class="p-3 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/50 rounded-lg cursor-grab hover:border-emerald-400 transition-colors shadow-sm flex items-center"
            >
              <div class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
              <span class="text-sm font-medium">{{ trigger.label }}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">执行动作库</h3>
          <div class="space-y-2">
            <div 
              v-for="action in availableActions" 
              :key="action.id"
              draggable="true"
              @dragstart="onDragStart($event, 'action', action.id, action.label)"
              class="p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900/50 rounded-lg cursor-grab hover:border-blue-400 transition-colors shadow-sm flex items-center"
            >
              <div class="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <span class="text-sm font-medium">{{ action.label }}</span>
            </div>
          </div>
        </div>
        
        <div class="mt-auto p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
          <p class="text-xs text-yellow-800 dark:text-yellow-200">
            提示：将左侧节点拖入右侧画布，点击连线端点即可连接流程。选中节点按 Backspace 键删除。
          </p>
        </div>
      </div>

      <!-- 画布区 -->
      <div class="flex-1 relative" @drop="onDrop" @dragover.prevent>
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ zoom: 1 }"
          class="w-full h-full"
        >
          <Background pattern-color="#aaa" :gap="20" />
          <Controls />
          
          <template #node-trigger="props">
            <div class="px-4 py-2 shadow-lg rounded-md bg-white dark:bg-gray-800 border-2 border-emerald-500 text-center min-w-[120px]">
              <div class="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-1">触发起点</div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ props.data.label }}</div>
              <Handle type="source" :position="Position.Right" />
            </div>
          </template>

          <template #node-action="props">
            <div class="px-4 py-2 shadow-lg rounded-md bg-white dark:bg-gray-800 border-2 border-blue-500 text-center min-w-[120px]">
              <Handle type="target" :position="Position.Left" />
              <div class="font-bold text-blue-600 dark:text-blue-400 text-sm mb-1">执行动作</div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ props.data.label }}</div>
              <Handle type="source" :position="Position.Right" />
            </div>
          </template>
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Save, ArrowLeft, Pencil } from 'lucide-vue-next'
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

import { useAutomationStore } from '~/stores/automation'

definePageMeta({ layout: 'default' })

const store = useAutomationStore()
const { $registry } = useNuxtApp() as any
const route = useRoute()

const availableTriggers = computed(() => $registry?.getAvailableTriggers() || [])
const availableActions = computed(() => $registry?.getAvailableActions() || [])

const currentFlow = computed(() => store.getFlow(route.params.id as string))

const { onConnect, addEdges, project } = useVueFlow()
const nodes = ref<any[]>([])
const edges = ref<any[]>([])

const isRenaming = ref(false)
const editName = ref('')

onConnect((connection) => {
  addEdges([
    {
      ...connection,
      animated: true,
      style: { stroke: '#000', strokeWidth: 2 }
    }
  ])
})

function saveFlow() {
  if (currentFlow.value) {
    currentFlow.value.nodes = nodes.value
    currentFlow.value.edges = edges.value
    store.saveState()
    alert('流程节点已保存！')
  }
}

function startRename() {
  if (currentFlow.value) {
    editName.value = currentFlow.value.name
    isRenaming.value = true
  }
}

function finishRename() {
  if (editName.value.trim() && currentFlow.value) {
    store.updateFlowName(route.params.id as string, editName.value.trim())
    store.saveState()
  }
  isRenaming.value = false
}

function onDragStart(event: DragEvent, nodeType: string, nodeId: string, label: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', JSON.stringify({ type: nodeType, nodeId, label }))
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDrop(event: DragEvent) {
  const dataString = event.dataTransfer?.getData('application/vueflow')
  if (!dataString) return

  const { type, nodeId, label } = JSON.parse(dataString)
  const position = project({
    x: event.clientX - 250,
    y: event.clientY - 100
  })

  nodes.value.push({
    id: `node-${Date.now()}`,
    type,
    position,
    data: { id: nodeId, label }
  })
}

onMounted(() => {
  if (currentFlow.value) {
    nodes.value = [...currentFlow.value.nodes]
    edges.value = [...currentFlow.value.edges]
  }
})
</script>

<style>
.dark .vue-flow__node {
  color: white;
}
.dark .vue-flow__edge-path {
  stroke: #fff !important;
}
</style>
