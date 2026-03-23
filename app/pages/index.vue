<template>
  <div class="space-y-4">
    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">音乐库</h1>
        <span class="text-gray-500 text-sm">{{ tracks.length }} 首歌曲</span>
      </div>

      <!-- 视图切换 -->
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          @click="setViewMode('grid')"
          :class="[
            'p-2 rounded-md transition-all duration-200',
            viewMode === 'grid'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <LayoutGrid class="w-5 h-5" />
        </button>
        <button
          @click="setViewMode('list')"
          :class="[
            'p-2 rounded-md transition-all duration-200',
            viewMode === 'list'
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <List class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- 上传进度提示 -->
    <Transition name="slide-left">
      <div
        v-if="uploadState.isUploading"
        class="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-3 z-50 min-w-[200px] max-w-[300px]"
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-gray-900 dark:text-white text-xs font-medium truncate flex-1 leading-tight">
            {{ uploadState.currentFile }}
            <br>
            <span class="text-blue-500 font-bold" v-if="uploadState.isProcessing">正在补全Tag...</span>
            <span class="text-gray-500" v-else>上传中...</span>
          </p>
          <span class="text-gray-900 dark:text-white text-xs font-bold ml-2">
            {{ uploadState.percentage }}%
          </span>
        </div>

        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            class="bg-black dark:bg-white h-1.5 rounded-full transition-all duration-200 ease-out"
            :style="{ width: `${uploadState.percentage}%` }"
          />
        </div>

        <p class="text-gray-500 dark:text-gray-400 text-[10px] mt-1.5">
          {{ uploadState.current }} / {{ uploadState.total }}
        </p>

        <div
          v-if="uploadState.error"
          class="mt-2 text-red-500 text-[10px] truncate"
        >
          {{ uploadState.error }}
        </div>
      </div>
    </Transition>

    <!-- 成功提示 -->
    <Transition name="slide-left">
      <div
        v-if="uploadState.successMessage && !uploadState.isUploading"
        class="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-3 z-50 min-w-[180px]"
      >
        <div class="flex items-center space-x-2">
          <div class="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <span class="text-gray-900 dark:text-white text-xs font-medium">{{ uploadState.successMessage }}</span>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <Transition name="slide-left">
      <div
        v-if="uploadState.error && !uploadState.isUploading && !uploadState.successMessage"
        class="fixed top-4 right-4 bg-red-500 text-white rounded-lg shadow-2xl p-3 z-50 min-w-[200px]"
      >
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span class="text-xs font-medium">{{ uploadState.error }}</span>
        </div>
      </div>
    </Transition>

    <!-- 上传按钮 -->
    <Transition name="scale">
      <button
        v-if="!uploadState.isUploading"
        @click="handleUpload"
        class="fixed bottom-20 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:shadow-3xl transition-all duration-200 z-40 group"
      >
        <Upload class="w-6 h-6" />
      </button>
    </Transition>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-gray-300 border-t-black dark:border-t-white rounded-full animate-spin" />
      <p class="text-gray-500 dark:text-gray-400 text-sm mt-4">加载中...</p>
    </div>

    <!-- 音乐列表/网格 -->
    <template v-else-if="tracks.length > 0">
      <TransitionGroup
        :name="viewMode === 'grid' ? 'grid' : 'list'"
        tag="div"
        :class="[
          'transition-all duration-300 w-full',
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
            : 'flex flex-col space-y-2'
        ]"
      >
        <MusicCard
          v-for="track in tracks"
          :key="track.id"
          :track="track"
          :view-mode="viewMode"
          :selected="selectedTracks.includes(track.id)"
          @select="toggleTrackSelection"
          @play="playTrack"
          @delete="handleDelete"
        />
      </TransitionGroup>
    </template>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center py-20">
      <div class="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <Music class="w-12 h-12 text-gray-400" />
      </div>
      <p class="text-gray-900 dark:text-gray-100 text-lg font-medium">暂无音乐</p>
      <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">点击右下角按钮上传音乐</p>
    </div>

    <!-- 批量操作栏 -->
    <Transition name="slide-up">
      <div
        v-if="selectedTracks.length > 0"
        class="fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-4 z-40 border border-gray-200 dark:border-gray-700"
      >
        <span class="text-sm font-medium">{{ selectedTracks.length }} 首已选择</span>
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-600" />
        <button
          @click="clearSelection"
          class="text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          取消选择
        </button>
        <button class="text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          添加到播放列表
        </button>
        <button class="text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-red-500">
          删除
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Upload, LayoutGrid, List, Music } from 'lucide-vue-next'
import type { AudioTrack } from '~/types/audio'
import { useAudioStore } from '~/stores/audio'
import { useLibraryStore } from '~/stores/library'

definePageMeta({
  layout: 'default'
})

const router = useRouter()
const audioStore = useAudioStore()
const libraryStore = useLibraryStore()

const viewMode = ref<'grid' | 'list'>('grid')
const selectedTracks = ref<string[]>([])
const isLoading = ref(true)

const uploadState = reactive({
  isUploading: false,
  isProcessing: false,
  currentFile: '',
  current: 0,
  total: 0,
  percentage: 0,
  error: '',
  successMessage: ''
})

const tracks = computed<AudioTrack[]>(() => libraryStore.tracks)

onMounted(async () => {
  await libraryStore.loadTracks()
  viewMode.value = libraryStore.filters.viewMode
  isLoading.value = false
})

function setViewMode(mode: 'grid' | 'list') {
  viewMode.value = mode
  libraryStore.setFilter('viewMode', mode)
}

function toggleTrackSelection(trackId: string) {
  const index = selectedTracks.value.indexOf(trackId)
  if (index > -1) {
    selectedTracks.value.splice(index, 1)
  } else {
    selectedTracks.value.push(trackId)
  }
}

function clearSelection() {
  selectedTracks.value = []
}

function playTrack(track: AudioTrack) {
  audioStore.play(track, libraryStore.tracks)
}

async function handleDelete(trackId: string) {
  try {
    await libraryStore.removeTrack(trackId)
    uploadState.successMessage = '删除成功'
    setTimeout(() => {
      uploadState.successMessage = ''
    }, 3000)
  } catch (error) {
    uploadState.error = '删除失败'
    setTimeout(() => {
      uploadState.error = ''
    }, 5000)
  }
}

function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*'
  input.multiple = true
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      uploadState.isUploading = true
      uploadState.total = files.length
      uploadState.current = 0
      uploadState.error = ''
      uploadState.successMessage = ''

      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file) continue
        uploadState.currentFile = file.name
        uploadState.current = i + 1
        uploadState.percentage = 0

        try {
          const result = await uploadWithProgress(file, (percentage) => {
            uploadState.percentage = percentage
            if (percentage >= 100 && !uploadState.isProcessing) {
               uploadState.isProcessing = true
            }
          })

          if (result.success && result.data) {
            await libraryStore.addTrack(result.data)
            successCount++
          } else {
            failCount++
            errors.push(`${file.name}: ${result.error || '上传失败'}`)
          }
        } catch (error) {
          failCount++
          const message = error instanceof Error ? error.message : '上传失败'
          errors.push(`${file.name}: ${message}`)
        }

        uploadState.percentage = 100
      }

      uploadState.isUploading = false
      uploadState.isProcessing = false

      if (successCount > 0 && failCount === 0) {
        uploadState.successMessage = `成功上传 ${successCount} 首歌曲`
      } else if (successCount > 0 && failCount > 0) {
        uploadState.error = `上传完成：${successCount} 首成功，${failCount} 首失败。${errors.join('；')}`
      } else {
        uploadState.error = errors.join('；') || '上传失败'
      }

      if (uploadState.successMessage) {
        setTimeout(() => {
          uploadState.successMessage = ''
        }, 3000)
      }

      if (uploadState.error && failCount > 0) {
        setTimeout(() => {
          uploadState.error = ''
        }, 5000)
      }
    }
  }
  input.click()
}

const uploadWithProgress = (file: File, onProgress: (percentage: number) => void): Promise<{ success: boolean; data?: any; error?: string }> => {
  return new Promise((resolve) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total)
        onProgress(percentage)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const responseData = JSON.parse(xhr.responseText)
          resolve({
            success: true,
            data: responseData
          })
        } catch {
          resolve({
            success: false,
            error: '服务器响应格式错误'
          })
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText)
          resolve({
            success: false,
            error: errorData.message || '上传失败'
          })
        } catch {
          resolve({
            success: false,
            error: `HTTP ${xhr.status}`
          })
        }
      }
    })

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: '网络错误'
      })
    })

    xhr.open('POST', '/api/upload')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.send(formData)
  })
}
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s ease;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.grid-move,
.grid-enter-active,
.grid-leave-active {
  transition: all 0.3s ease;
}
.grid-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.grid-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>