<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '~/stores/settings'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.loadSettings()
  settingsStore.applyTheme(settingsStore.settings.theme)
})
</script>
