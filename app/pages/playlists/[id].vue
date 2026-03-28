<template>
  <div class="space-y-6" v-if="playlist">
    <section class="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div class="grid gap-6 px-6 py-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <div class="overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
          <img
            v-if="playlist.coverUrl"
            :src="playlist.coverUrl"
            :alt="playlist.name"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex aspect-square items-center justify-center text-sm text-gray-400">暂无封面</div>
        </div>
        <div class="flex flex-col justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-gray-400">{{ playlist.source.toUpperCase() }}</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{{ playlist.name }}</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">{{ playlist.description || '暂无简介' }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{{ playlist.trackCount }} 首歌曲</span>
            <span>·</span>
            <span>{{ playlist.ownerName || '未知用户' }}</span>
            <span>·</span>
            <span>{{ playlist.lastSyncedAt ? `上次同步 ${formatDate(playlist.lastSyncedAt)}` : '尚未同步' }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">歌曲</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">专辑</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">时长</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-for="item in playlist.items" :key="item.id">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900 dark:text-white">{{ item.name }}</div>
              <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ item.artist }}</div>
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ item.album || '未知专辑' }}</td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ formatDuration(item.duration) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-else class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
    正在加载歌单...
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePlaylistStore } from '~/stores/playlist'

definePageMeta({ layout: 'default' })

const route = useRoute()
const playlistStore = usePlaylistStore()
const { currentPlaylist: playlist } = storeToRefs(playlistStore)

function formatDuration(seconds?: number | null) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}

onMounted(() => {
  playlistStore.loadPlaylist(route.params.id as string)
})
</script>
