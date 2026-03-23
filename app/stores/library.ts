import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AudioTrack } from '~/types/audio'

export interface LibraryFilters {
  search?: string
  artist?: string
  album?: string
  genre?: string
  year?: number
  sortBy: 'title' | 'artist' | 'album' | 'createdAt' | 'year'
  sortOrder: 'asc' | 'desc'
  viewMode: 'grid' | 'list'
}

export const useLibraryStore = defineStore('library', () => {
  // 状态
  const tracks = ref<AudioTrack[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const selectedTracks = ref<Set<string>>(new Set())
  
  // 从 localStorage 加载视图模式
  const savedViewMode = typeof window !== 'undefined' 
    ? (localStorage.getItem('library-view-mode') as 'grid' | 'list' || 'grid')
    : 'grid'
  
  const filters = ref<LibraryFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    viewMode: savedViewMode
  })

  // 计算属性
  const filteredTracks = computed(() => {
    let result = [...tracks.value]

    // 搜索过滤
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      result = result.filter(track =>
        track.title.toLowerCase().includes(searchLower) ||
        track.artist.toLowerCase().includes(searchLower) ||
        track.album?.toLowerCase().includes(searchLower)
      )
    }

    // 艺术家过滤
    if (filters.value.artist) {
      result = result.filter(track =>
        track.artist === filters.value.artist
      )
    }

    // 专辑过滤
    if (filters.value.album) {
      result = result.filter(track =>
        track.album === filters.value.album
      )
    }

    // 类型过滤
    if (filters.value.genre) {
      result = result.filter(track =>
        track.genre === filters.value.genre
      )
    }

    // 年份过滤
    if (filters.value.year) {
      result = result.filter(track =>
        track.year === filters.value.year
      )
    }

    // 排序
    result.sort((a, b) => {
      const key = filters.value.sortBy
      let comparison = 0

      switch (key) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'artist':
          comparison = a.artist.localeCompare(b.artist)
          break
        case 'album':
          comparison = (a.album || '').localeCompare(b.album || '')
          break
        case 'year':
          comparison = (a.year || 0) - (b.year || 0)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return filters.value.sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  })

  const artists = computed(() => {
    const artistSet = new Set(tracks.value.map(t => t.artist))
    return Array.from(artistSet).sort()
  })

  const albums = computed(() => {
    const albumSet = new Set(tracks.value.filter(t => t.album).map(t => t.album!))
    return Array.from(albumSet).sort()
  })

  const genres = computed(() => {
    const genreSet = new Set(tracks.value.filter(t => t.genre).map(t => t.genre!))
    return Array.from(genreSet).sort()
  })

  const years = computed(() => {
    const yearSet = new Set(tracks.value.filter(t => t.year).map(t => t.year!))
    return Array.from(yearSet).sort((a, b) => b - a)
  })

  const allSelected = computed(() => {
    return filteredTracks.value.length > 0 &&
      filteredTracks.value.every(t => selectedTracks.value.has(t.id))
  })

  const selectionCount = computed(() => {
    return selectedTracks.value.size
  })

  // 方法
  async function loadTracks() {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<AudioTrack[]>('/api/tracks')
      tracks.value = response
    } catch (err) {
      error.value = '加载音乐库失败'
      console.error(err)
    } finally {
      isLoading.value = false
    }
  }

  async function addTrack(track: AudioTrack) {
    const exists = tracks.value.find(t => t.id === track.id)
    if (!exists) {
      // upload.post.ts already saves to DB, so just add to local state
      tracks.value = [...tracks.value, track]
    }
  }

  async function removeTrack(trackId: string) {
    try {
      await $fetch(`/api/tracks/${trackId}`, { method: 'DELETE' })
      const index = tracks.value.findIndex(t => t.id === trackId)
      if (index !== -1) {
        tracks.value.splice(index, 1)
        selectedTracks.value.delete(trackId)
      }
    } catch (err) {
      console.error('删除音乐失败:', err)
      throw err
    }
  }

  function updateTrack(trackId: string, updates: Partial<AudioTrack>) {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      Object.assign(track, updates)
    }
  }

  function toggleSelection(trackId: string) {
    if (selectedTracks.value.has(trackId)) {
      selectedTracks.value.delete(trackId)
    } else {
      selectedTracks.value.add(trackId)
    }
  }

  function selectAll() {
    filteredTracks.value.forEach(track => {
      selectedTracks.value.add(track.id)
    })
  }

  function clearSelection() {
    selectedTracks.value.clear()
  }

  function bulkDelete() {
    tracks.value = tracks.value.filter(t => !selectedTracks.value.has(t.id))
    selectedTracks.value.clear()
  }

  function setFilter<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) {
    filters.value[key] = value
  }

  function resetFilters() {
    filters.value = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
      viewMode: 'grid'
    }
  }

  function toggleViewMode() {
    filters.value.viewMode = filters.value.viewMode === 'grid' ? 'list' : 'grid'
    // 持久化到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('library-view-mode', filters.value.viewMode)
    }
  }

  return {
    // 状态
    tracks,
    isLoading,
    error,
    selectedTracks,
    filters,
    // 计算属性
    filteredTracks,
    artists,
    albums,
    genres,
    years,
    allSelected,
    selectionCount,
    // 方法
    loadTracks,
    addTrack,
    removeTrack,
    updateTrack,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDelete,
    setFilter,
    resetFilters,
    toggleViewMode,
  }
})
