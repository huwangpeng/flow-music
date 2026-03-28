<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">歌单</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">创建并管理你的本地歌单。</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          class="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          @click="createLocalPlaylist"
        >
          新建歌单
        </button>
        <NuxtLink
          to="/scripts"
          class="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          前往插件中心
        </NuxtLink>
      </div>
    </div>

    <div v-if="playlistStore.isLoading" class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
      正在加载歌单...
    </div>

    <div v-else-if="playlistStore.playlists.length === 0" class="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <p class="text-lg font-medium text-gray-900 dark:text-white">暂无歌单</p>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">创建你的第一张歌单。</p>
      <button
        class="mt-6 inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100"
        @click="createLocalPlaylist"
      >
        新建歌单
      </button>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="playlist in playlistStore.playlists"
        :key="playlist.id"
        :to="`/playlists/${playlist.id}`"
        class="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      >
        <div class="aspect-[1.8/1] bg-gray-100 dark:bg-gray-800">
          <img
            v-if="playlist.coverUrl"
            :src="playlist.coverUrl"
            :alt="playlist.name"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-gray-400">暂无封面</div>
        </div>
        <div class="space-y-3 p-5">
          <div>
            <h2 class="truncate text-lg font-semibold text-gray-900 dark:text-white">{{ playlist.name }}</h2>
            <p class="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{{ playlist.description || '暂无简介' }}</p>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{{ playlist.trackCount }} 首歌曲</span>
            <span>{{ playlist.ownerName || '未知用户' }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { usePlaylistStore } from '~/stores/playlist'

definePageMeta({ layout: 'default' })

const playlistStore = usePlaylistStore()

async function createLocalPlaylist() {
  const name = window.prompt('请输入歌单名称')?.trim()
  if (!name) return
  const playlist = await playlistStore.createPlaylist({ name })
  if (playlist?.id) {
    navigateTo(`/playlists/${playlist.id}`)
  }
}

onMounted(() => {
  playlistStore.loadPlaylists()
})
</script>
