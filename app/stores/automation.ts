import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface FlowNode {
  id: string
  type: string
  position: { x: number, y: number }
  data?: any
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  animated?: boolean
  style?: any
}

export interface AutomationFlow {
  id: string
  name: string
  enabled: boolean
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export const useAutomationStore = defineStore('automation', () => {
  const flows = ref<AutomationFlow[]>([])

  function loadState() {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('automation-flows')
    if (saved) {
      try {
        flows.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load automation flows', e)
        flows.value = []
      }
    }
  }

  function saveState() {
    if (typeof window === 'undefined') return
    localStorage.setItem('automation-flows', JSON.stringify(flows.value))
  }

  watch(flows, saveState, { deep: true })

  function getFlow(id: string) {
    return flows.value.find(f => f.id === id)
  }

  function addFlow() {
    const newFlow: AutomationFlow = {
      id: `flow-${Date.now()}`,
      name: '新自动化规则',
      enabled: false,
      nodes: [],
      edges: []
    }
    flows.value.push(newFlow)
    return newFlow.id
  }

  function updateFlowName(id: string, name: string) {
    const f = getFlow(id)
    if (f) f.name = name
  }

  function deleteFlow(id: string) {
    flows.value = flows.value.filter(f => f.id !== id)
  }

  function toggleFlow(id: string) {
    const f = getFlow(id)
    if (f) f.enabled = !f.enabled
  }

  if (typeof window !== 'undefined') {
    loadState()
  }

  return { flows, loadState, saveState, getFlow, addFlow, updateFlowName, deleteFlow, toggleFlow }
})
