import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AudioTrack } from '~/types/audio'

export interface NCMMetadata {
  title: string
  artist: string
  album: string
  year: number
  genre: string
  coverUrl: string
  duration: number
  lyrics: string | null
}

export interface SearchResult {
  id: string
  title: string
  artist: string
  album?: string
  source: 'ncm' | 'local'
  coverUrl?: string
  duration?: number
}

export const useMetadataStore = defineStore('metadata', () => {
  // 状态
  const isSearching = ref(false)
  const isApplying = ref(false)
  const lastSearchResults = ref<SearchResult[]>([])
  const lastFetchedMetadata = ref<NCMMetadata | null>(null)
  const error = ref<string | null>(null)
  const searchHistory = ref<string[]>([])

  /**
   * Search for tracks by keyword across multiple sources
   */
  async function searchTrack(keyword: string): Promise<SearchResult[]> {
    isSearching.value = true
    error.value = null

    try {
      const response = await $fetch<{
        success: boolean
        results: SearchResult[]
        total: number
        error?: string
      }>('/api/metadata/search', {
        method: 'POST',
        body: { keyword, limit: 20 }
      })

      if (response.success) {
        lastSearchResults.value = response.results

        // Add to search history
        if (keyword && !searchHistory.value.includes(keyword)) {
          searchHistory.value.unshift(keyword)
          if (searchHistory.value.length > 10) {
            searchHistory.value.pop()
          }
        }

        return response.results
      } else {
        throw new Error(response.error || '搜索失败')
      }
    } catch (err: any) {
      error.value = err.message || '搜索失败'
      console.error('搜索失败:', err)
      return []
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Fetch track metadata from NCM
   */
  async function fetchNCMTrack(title: string, artist: string, duration?: number): Promise<NCMMetadata | null> {
    isSearching.value = true
    error.value = null
    lastFetchedMetadata.value = null

    try {
      const response = await $fetch<{
        success: boolean
        data?: NCMMetadata
        error?: string
        source: 'ncm' | 'local' | 'fallback'
      }>('/api/metadata/ncm', {
        method: 'POST',
        body: { title, artist, duration }
      })

      if (response.success && response.data) {
        lastFetchedMetadata.value = response.data
        return response.data
      } else {
        throw new Error(response.error || '未找到匹配的歌曲')
      }
    } catch (err: any) {
      error.value = err.message || '获取元数据失败'
      console.error('获取NCM元数据失败:', err)
      return null
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Apply metadata to a track
   */
  async function applyMetadata(trackId: string, metadata: Partial<AudioTrack>): Promise<boolean> {
    isApplying.value = true
    error.value = null

    try {
      // Update track via API
      const response = await $fetch<AudioTrack>(`/api/tracks`, {
        method: 'POST',
        body: {
          uuid: trackId,
          ...metadata
        }
      })

      return !!response
    } catch (err: any) {
      error.value = err.message || '应用元数据失败'
      console.error('应用元数据失败:', err)
      return false
    } finally {
      isApplying.value = false
    }
  }

  /**
   * Auto-complete metadata for a track (combines fetch and apply)
   */
  async function autoCompleteMetadata(track: AudioTrack): Promise<NCMMetadata | null> {
    const metadata = await fetchNCMTrack(track.title, track.artist, track.duration)

    if (metadata) {
      const success = await applyMetadata(track.id, {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year,
        genre: metadata.genre,
        duration: metadata.duration,
        lyrics: metadata.lyrics || null
      })

      if (success) {
        return metadata
      }
    }

    return null
  }

  /**
   * Clear search results
   */
  function clearSearchResults() {
    lastSearchResults.value = []
    lastFetchedMetadata.value = null
    error.value = null
  }

  /**
   * Clear search history
   */
  function clearSearchHistory() {
    searchHistory.value = []
  }

  return {
    // 状态
    isSearching,
    isApplying,
    lastSearchResults,
    lastFetchedMetadata,
    error,
    searchHistory,
    // 方法
    searchTrack,
    fetchNCMTrack,
    applyMetadata,
    autoCompleteMetadata,
    clearSearchResults,
    clearSearchHistory
  }
})