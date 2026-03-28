import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CreatePlaylistInput, PlaylistDetail, PlaylistSummary } from '~/types/playlist'

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<PlaylistSummary[]>([])
  const currentPlaylist = ref<PlaylistDetail | null>(null)
  const isLoading = ref(false)

  const playlistCount = computed(() => playlists.value.length)

  async function loadPlaylists() {
    isLoading.value = true
    try {
      playlists.value = await $fetch<PlaylistSummary[]>('/api/playlists')
    } finally {
      isLoading.value = false
    }
  }

  async function loadPlaylist(id: string) {
    isLoading.value = true
    try {
      currentPlaylist.value = await $fetch<PlaylistDetail>(`/api/playlists/${id}`)
      return currentPlaylist.value
    } finally {
      isLoading.value = false
    }
  }

  async function createPlaylist(payload: CreatePlaylistInput) {
    const playlist = await $fetch<PlaylistSummary>('/api/playlists', {
      method: 'POST',
      body: payload
    })
    playlists.value.unshift(playlist)
    return playlist
  }

  return {
    playlists,
    currentPlaylist,
    isLoading,
    playlistCount,
    loadPlaylists,
    loadPlaylist,
    createPlaylist
  }
})
