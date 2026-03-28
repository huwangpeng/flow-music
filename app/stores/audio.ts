import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AudioTrack } from '~/types/audio'

export type RepeatMode = 'off' | 'all' | 'one'
export type PlayMode = 'list' | 'single' | 'shuffle' | 'sequence'

export function getPlayModeFromStore(shuffleValue: boolean, repeatModeValue: RepeatMode): PlayMode {
  if (shuffleValue && repeatModeValue === 'off') {
    return 'shuffle'
  }
  if (!shuffleValue && repeatModeValue === 'one') {
    return 'single'
  }
  if (!shuffleValue && repeatModeValue === 'off') {
    return 'sequence'
  }
  return 'list'
}

export function setPlayModeToStore(
  mode: PlayMode,
  setShuffle: (value: boolean) => void,
  setRepeatMode: (mode: RepeatMode) => void
) {
  switch (mode) {
    case 'list':
      setShuffle(false)
      setRepeatMode('all')
      break
    case 'single':
      setShuffle(false)
      setRepeatMode('one')
      break
    case 'shuffle':
      setShuffle(true)
      setRepeatMode('off')
      break
    case 'sequence':
      setShuffle(false)
      setRepeatMode('off')
      break
  }
}

const STORAGE_KEY = 'flow-music-playback-settings'

function loadPlaybackSettings() {
  const defaultSettings = { shuffle: false, repeatMode: 'off' as 'off' | 'all' | 'one', volume: 0.8, isMuted: false }
  if (typeof window === 'undefined') return defaultSettings
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        shuffle: parsed.shuffle ?? false,
        repeatMode: parsed.repeatMode ?? 'off',
        volume: typeof parsed.volume === 'number' ? parsed.volume : 0.8,
        isMuted: parsed.isMuted ?? false
      }
    }
  } catch (error) {
    console.error('加载播放设置失败:', error)
  }
  return defaultSettings
}

function savePlaybackSettings(shuffleValue: boolean, repeatModeValue: 'off' | 'all' | 'one', volumeValue?: number, isMutedValue?: boolean) {
  if (typeof window === 'undefined') return
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    let currentSettings = { shuffle: false, repeatMode: 'off', volume: 0.8, isMuted: false }
    if (saved) {
      try {
        currentSettings = JSON.parse(saved)
      } catch {
        // 解析失败，使用默认值
      }
    }
    const newSettings = {
      shuffle: shuffleValue,
      repeatMode: repeatModeValue,
      volume: volumeValue ?? currentSettings.volume ?? 0.8,
      isMuted: isMutedValue ?? currentSettings.isMuted ?? false
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  } catch (error) {
    console.error('保存播放设置失败:', error)
  }
}

export const useAudioStore = defineStore('audio', () => {
  const playbackSettings = loadPlaybackSettings()
  
  // 状态
  const currentTrack = ref<AudioTrack | null>(null)
  const isPlaying = ref(false)
  const volume = ref(playbackSettings.volume)
  const isMuted = ref(playbackSettings.isMuted)
  const currentTime = ref(0)
  const duration = ref(0)
  const shuffle = ref(playbackSettings.shuffle)
  const repeatMode = ref<RepeatMode>(playbackSettings.repeatMode)
  const queue = ref<AudioTrack[]>([])
  const queueIndex = ref(-1)
  const audioElement = ref<HTMLAudioElement | null>(null)
  const currentLyrics = ref<Array<{ time: number; text: string }> | null>(null)
  const bufferedPercent = ref(0)
  const isShuffled = ref(false)

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
    }
    
    // 确保事件监听器被注册（移除旧的监听器避免重复）
    audioElement.value.ontimeupdate = () => {
      if (audioElement.value) {
        currentTime.value = audioElement.value.currentTime
      }
    }
    
    audioElement.value.onloadedmetadata = () => {
      if (audioElement.value) {
        duration.value = audioElement.value.duration
      }
    }
    
    audioElement.value.onended = () => {
      handleTrackEnd()
    }
    
    audioElement.value.onplay = () => {
      isPlaying.value = true
    }
    
    audioElement.value.onpause = () => {
      isPlaying.value = false
    }
    
    audioElement.value.onprogress = () => {
      if (audioElement.value && duration.value > 0) {
        const buffered = audioElement.value.buffered
        if (buffered.length > 0) {
          const bufferedEnd = buffered.end(buffered.length - 1)
          bufferedPercent.value = Math.min(100, (bufferedEnd / duration.value) * 100)
        }
      }
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
    if (track.lyrics && Array.isArray(track.lyrics)) {
      currentLyrics.value = track.lyrics as Array<{ time: number; text: string }>
    } else {
      currentLyrics.value = null
    }
    
    if (track.filePath) {
      audioElement.value!.src = track.filePath
      audioElement.value!.load()
      audioElement.value!.play().then(() => {
        isPlaying.value = true
      }).catch(error => {
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
       // 如果尚未打乱队列，先打乱一次
       if (!isShuffled.value) {
         shuffleQueue()
       }
       // 按顺序播放已打乱的队列
       queueIndex.value++
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
       // 打乱模式下按顺序播放已打乱的队列（与playNext保持一致）
       if (isShuffled.value && queueIndex.value > 0) {
         queueIndex.value--
       } else {
         // 重新打乱队列
         shuffleQueue()
         queueIndex.value = queue.value.length - 1 // 播放最后一首（因为是逆序）
       }
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
    savePlaybackSettings(shuffle.value, repeatMode.value, volume.value, isMuted.value)
  }

  function setMute(muted: boolean) {
    isMuted.value = muted
    if (audioElement.value) {
      audioElement.value.muted = muted
    }
    savePlaybackSettings(shuffle.value, repeatMode.value, volume.value, muted)
  }

  function seek(time: number) {
    if (audioElement.value) {
      audioElement.value.currentTime = Math.max(0, Math.min(duration.value, time))
      currentTime.value = audioElement.value.currentTime
    }
  }

  function setRepeatMode(mode?: RepeatMode) {
    const modes: RepeatMode[] = ['off', 'all', 'one']
    const nextMode = mode ?? modes[(modes.indexOf(repeatMode.value) + 1) % modes.length] ?? 'off'

    repeatMode.value = nextMode
    savePlaybackSettings(shuffle.value, nextMode, volume.value, isMuted.value)
  }

   function shuffleQueue() {
     const currentTrackId = currentTrack.value?.id
     const currentTrackIndex = queueIndex.value
     
     // 创建新数组进行打乱
     const shuffled = [...queue.value]
     for (let i = shuffled.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1))
       const temp = shuffled[i]!
       shuffled[i] = shuffled[j]!
       shuffled[j] = temp
     }
     
     // 如果当前有歌曲播放，将其放到第一位
     if (currentTrackId !== undefined) {
       const currentIdx = shuffled.findIndex(t => t.id === currentTrackId)
       if (currentIdx > 0) {
         const temp = shuffled[0]!
         shuffled[0] = shuffled[currentIdx]!
         shuffled[currentIdx] = temp
       }
       queueIndex.value = 0
     }
     
     queue.value = shuffled
     isShuffled.value = true
   }

   function toggleShuffle() {
     shuffle.value = !shuffle.value
     savePlaybackSettings(shuffle.value, repeatMode.value, volume.value, isMuted.value)
     if (shuffle.value) {
       shuffleQueue()
     } else {
       isShuffled.value = false
     }
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
