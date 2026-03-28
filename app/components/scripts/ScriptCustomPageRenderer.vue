<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
      <span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        自定义页面
      </span>
    </div>

    <div class="mt-6 space-y-4">
      <div
        v-for="section in sections"
        :key="section.id"
        class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">{{ section.title }}</h3>
            <p v-if="section.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ section.description }}</p>
          </div>
          <button
            v-if="section.actionLabel"
            type="button"
            class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            @click="$emit('action', section.id)"
          >
            {{ section.actionLabel }}
          </button>
        </div>

        <div v-if="section.fields?.length" class="mt-4 grid gap-3 md:grid-cols-2">
          <div
            v-for="field in section.fields"
            :key="field.key"
            class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/70"
          >
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ field.label }}</p>
            <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">{{ field.value }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RenderField {
  key: string
  label: string
  value: string
}

interface RenderSection {
  id: string
  title: string
  description?: string
  actionLabel?: string
  fields?: RenderField[]
}

defineProps<{
  title: string
  description?: string
  sections: RenderSection[]
}>()

defineEmits<{
  action: [sectionId: string]
}>()
</script>
