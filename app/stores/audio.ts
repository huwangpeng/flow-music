import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AudioTrack } from '~/types/audio'

export const useAudioStore = defineStore('audio', () => {
  
  // 状态
  const currentTrack = ref<AudioTrack | null>(null)
  const isPlaying = ref(false)
  const volume = ref(0.8)
  const isMuted = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const shuffle = ref(false)
  const repeatMode = ref<'off' | 'all' | 'one'>('off')
  const queue = ref<AudioTrack[]>([])
  const queueIndex = ref(-1)
  const audioElement = ref<HTMLAudioElement | null>(null)
  const currentLyrics = ref<Array<{ time: number; text: string }> | null>(null)
  const bufferedPercent = ref(0)

  // 计算属性
  const hasNext = computed(() => {
    if (shuffle.value) {
      return queue.value.length > 1
    }
    return queueIndex.value < queue.value.length - 1
  })

  const hasPrevious = computed(() => {
    if (shuffle.value) {
      return queue.value.length > 1
    }
    return queueIndex.value > 0
  })

  // 方法
  function initAudio() {
    if (!audioElement.value) {
      audioElement.value = new Audio()
      
      audioElement.value.addEventListener('timeupdate', () => {
        currentTime.value = audioElement.value!.currentTime
      })
      
      audioElement.value.addEventListener('loadedmetadata', () => {
        duration.value = audioElement.value!.duration
      })
      
      audioElement.value.addEventListener('ended', () => {
        handleTrackEnd()
      })
      
      audioElement.value.addEventListener('play', () => {
        isPlaying.value = true
      })
      
      audioElement.addEventListener('pause', () => {
        isPlaying.value = false
      })
      
      // 监听缓冲进度
      audioElement.value.addEventListener('progress', () => {
        if (audioElement.value && duration.value > 0) {
          const buffered = audioElement.value.buffered
          if (buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1)
            bufferedPercent.value = Math.min(100, (bufferedEnd / duration.value) * 100)
          }
        }
      })
    }
  }

  function handleTrackEnd() {
    if (repeatMode.value === 'one') {
      play(currentTrack.value!)
    } else if (repeatMode.value === 'all' || queueIndex.value < queue.value.length - 1) {
      playNext()
    } else {
      isPlaying.value = false
    }
  }

  async function uploadAudio(file: File): Promise<AudioTrack> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await $fetch<AudioTrack>('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })
      
      return response
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '上传失败'
      console.error('上传失败:', message, error)
      throw error
    }
  }

  function play(track: AudioTrack, newQueue?: AudioTrack[]) {
    initAudio()
    
    if (newQueue) {
      queue.value = newQueue
      queueIndex.value = newQueue.findIndex(t => t.id === track.id)
    } else if (!queue.value.find(t => t.id === track.id)) {
      queue.value.push(track)
      queueIndex.value = queue.value.length - 1
    } else {
      queueIndex.value = queue.value.findIndex(t => t.id === track.id)
    }

    currentTrack.value = track
    
    // 加载歌词（如果有）
    if (track.lyrics) {
      currentLyrics.value = track.lyrics
    } else {
      currentLyrics.value = null
    }
    
    if (track.filePath) {
      audioElement.value!.src = track.filePath
      audioElement.value!.load()
      audioElement.value!.play().catch(error => {
        console.error('播放失败:', error)
        isPlaying.value = false
      })
    } else {
      isPlaying.value = false
    }
    
    currentTime.value = 0
    bufferedPercent.value = 0
  }

  function pause() {
    if (audioElement.value) {
      audioElement.value.pause()
    }
    isPlaying.value = false
  }

  function togglePlay() {
    if (!currentTrack.value) return
    
    if (isPlaying.value) {
      pause()
    } else {
      if (audioElement.value) {
        audioElement.value.play()
      }
      isPlaying.value = true
    }
  }

  function stop() {
    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.src = ''
    }
    isPlaying.value = false
    currentTrack.value = null
    currentLyrics.value = null
    currentTime.value = 0
    duration.value = 0
    bufferedPercent.value = 0
  }

  function playNext() {
    if (!hasNext.value) return
    
    if (shuffle.value) {
      const nextIndex = Math.floor(Math.random() * queue.value.length)
      queueIndex.value = nextIndex
    } else {
      queueIndex.value++
    }
    
    const next = queue.value[queueIndex.value]
    if (next) {
      currentTrack.value = next
      if (audioElement.value && next.filePath) {
        audioElement.value.src = next.filePath
        audioElement.value.load()
        audioElement.value.play()
      }
      currentTime.value = 0
      isPlaying.value = true
    }
  }

  function playPrevious() {
    if (!hasPrevious.value) return
    
    if (shuffle.value) {
      const prevIndex = Math.floor(Math.random() * queue.value.length)
      queueIndex.value = prevIndex
    } else {
      queueIndex.value--
    }
    
    const prev = queue.value[queueIndex.value]
    if (prev) {
      currentTrack.value = prev
      if (audioElement.value && prev.filePath) {
        audioElement.value.src = prev.filePath
        audioElement.value.load()
        audioElement.value.play()
      }
      currentTime.value = 0
      isPlaying.value = true
    }
  }

  function setVolume(newVolume: number) {
    volume.value = Math.max(0, Math.min(1, newVolume))
    if (audioElement.value) {
      audioElement.value.volume = volume.value
    }
    if (newVolume > 0) {
      isMuted.value = false
    }
  }

  function setMute(muted: boolean) {
    isMuted.value = muted
    if (audioElement.value) {
      audioElement.value.muted = muted
    }
  }

  function seek(time: number) {
    if (audioElement.value) {
      audioElement.value.currentTime = Math.max(0, Math.min(duration.value, time))
      currentTime.value = audioElement.value.currentTime
    }
  }

  function setRepeatMode(mode: 'off' | 'all' | 'one') {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one']
    const currentIndex = modes.indexOf(repeatMode.value)
    repeatMode.value = modes[(currentIndex + 1) % modes.length]
  }

  function toggleShuffle() {
    shuffle.value = !shuffle.value
  }

  function addToQueue(track: AudioTrack) {
    queue.value.push(track)
  }

  function removeFromQueue(trackId: string) {
    const index = queue.value.findIndex(t => t.id === trackId)
    if (index !== -1) {
      queue.value.splice(index, 1)
      if (index < queueIndex.value) {
        queueIndex.value--
      }
    }
  }

  function clearQueue() {
    queue.value = []
    queueIndex.value = -1
    stop()
  }

  return {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    shuffle,
    repeatMode,
    queue,
    queueIndex,
    audioElement,
    currentLyrics,
    bufferedPercent,
    hasNext,
    hasPrevious,
    uploadAudio,
    play,
    pause,
    togglePlay,
    stop,
    playNext,
    playPrevious,
    setVolume,
    setMute,
    seek,
    setRepeatMode,
    toggleShuffle,
    addToQueue,
    removeFromQueue,
    clearQueue,
  }
})
