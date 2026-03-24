<template>
  <div class="space-y-4">
    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">音乐库</h1>
        <span class="text-gray-500 text-sm">{{ tracks.length }} 首歌曲</span>
      </div>

      <!-- 视图切换 -->
      <div class="relative w-[88px] h-10 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-hidden">
        <div
          class="absolute top-1 w-10 h-8 bg-black dark:bg-white rounded-md shadow-md transition-all duration-300 ease-out"
          :style="{ transform: `translateX(${viewMode === 'grid' ? '0' : '40px'})` }"
        />
        <div class="relative flex items-center h-full">
          <button
            @click="setViewMode('grid')"
            :class="[
              'relative z-10 w-10 h-8 flex items-center justify-center rounded-md transition-colors duration-300',
              viewMode === 'grid'
                ? 'text-white dark:text-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <LayoutGrid class="w-5 h-5" />
          </button>
          <button
            @click="setViewMode('list')"
            :class="[
              'relative z-10 w-10 h-8 flex items-center justify-center rounded-md transition-colors duration-300',
              viewMode === 'list'
                ? 'text-white dark:text-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <List class="w-5 h-5" />
          </button>
        </div>
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
        v-if="!uploadState.isUploading && !showUploadModal"
        @click="showUploadModal = true"
        class="fixed bottom-20 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:shadow-3xl transition-all duration-200 z-40 group"
      >
        <Upload class="w-6 h-6" />
      </button>
    </Transition>

    <!-- 上传窗口 -->
    <Transition name="fade">
      <div
        v-if="showUploadModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="showUploadModal = false"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <!-- 窗口头部 -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">上传音乐</h3>
            <button
              @click="showUploadModal = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- 拖拽区域 -->
          <div
            class="p-6"
            :class="{ 'bg-blue-50 dark:bg-blue-900/20': isDragging }"
          >
            <div
              class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-blue-500"
              :class="{ 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20': isDragging }"
              @click="triggerFileInput"
            >
              <Upload class="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p class="text-gray-700 dark:text-gray-300 font-medium">
                {{ isDragging ? '释放以上传' : '点击或拖拽文件到这里' }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                支持 MP3, FLAC, WAV, M4A 等格式
              </p>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept="audio/*"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>

            <!-- 文件列表 -->
            <div v-if="selectedFiles.length > 0" class="mt-4 max-h-40 overflow-y-auto space-y-2">
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-600 dark:text-gray-400">已选择 {{ selectedFiles.length }} 个文件</span>
                <button
                  @click="clearFiles"
                  class="text-red-500 hover:text-red-600 text-xs"
                >
                  清空
                </button>
              </div>
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div class="flex items-center space-x-2 overflow-hidden flex-1">
                  <Music class="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ file.name }}</span>
                </div>
                <button
                  @click="removeFile(index)"
                  class="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 上传按钮 -->
            <div class="mt-4 flex justify-end space-x-2">
              <button
                @click="showUploadModal = false"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                @click="startUpload"
                :disabled="selectedFiles.length === 0 || isUploading"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Upload class="w-4 h-4" />
                <span>{{ isUploading ? '上传中...' : '开始上传' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
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
          'transition-all duration-300 w-full relative',
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
import { Upload, LayoutGrid, List, Music, X } from 'lucide-vue-next'
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
const showUploadModal = ref(false)
const isDragging = ref(false)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const selectedFiles = ref<File[]>([])

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

// 拖拽事件处理
const handleDragOver = () => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files) {
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('audio/'))
    addFiles(files)
  }
  isDragging.value = false
}

// 触发文件输入框
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 文件选择处理
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files).filter(file => file.type.startsWith('audio/'))
    addFiles(files)
  }
}

// 添加文件到列表
const addFiles = (files: File[]) => {
  files.forEach(file => {
    if (!selectedFiles.value.some(f => f.name === file.name && f.size === file.size)) {
      selectedFiles.value.push(file)
    }
  })
}

// 移除文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 清空所有文件
const clearFiles = () => {
  selectedFiles.value = []
}

// 开始上传
const startUpload = async () => {
  if (selectedFiles.value.length === 0) return

  isUploading.value = true
  uploadState.isUploading = true
  uploadState.total = selectedFiles.value.length
  uploadState.current = 0
  uploadState.error = ''
  uploadState.successMessage = ''

  let successCount = 0
  let failCount = 0
  const errors: string[] = []

  for (let i = 0; i < selectedFiles.value.length; i++) {
    const file = selectedFiles.value[i]
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

  isUploading.value = false
  uploadState.isUploading = false
  uploadState.isProcessing = false
  showUploadModal.value = false
  selectedFiles.value = []

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

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.grid-enter-from {
  opacity: 0;
  transform: perspective(1000px) rotateY(-90deg) scale(0.8);
}
.grid-leave-to {
  opacity: 0;
  transform: perspective(1000px) rotateY(90deg) scale(1.05);
}
.grid-leave-active {
  position: absolute;
  width: 100%;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from {
  opacity: 0;
  transform: perspective(1000px) rotateX(-90deg) scale(0.9);
}
.list-leave-to {
  opacity: 0;
  transform: perspective(1000px) rotateX(90deg) scale(1.02);
}
.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>