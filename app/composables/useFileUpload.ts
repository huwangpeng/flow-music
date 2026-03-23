import { ref } from 'vue'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  success: boolean
  data?: any
  error?: string
}

export function useFileUpload() {
  const uploading = ref(false)
  const progress = ref<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0
  })
  const error = ref<string | null>(null)

  const upload = async (file: File, url: string = '/api/upload'): Promise<UploadResult> => {
    uploading.value = true
    error.value = null
    progress.value = { loaded: 0, total: 0, percentage: 0 }

    return new Promise((resolve) => {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // 监听上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          progress.value = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded * 100) / event.total)
          }
        }
      })

      // 上传完成
      xhr.addEventListener('load', () => {
        uploading.value = false
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const responseData = JSON.parse(xhr.responseText)
            resolve({
              success: true,
              data: responseData
            })
          } catch (e) {
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
              error: `HTTP ${xhr.status}: ${xhr.statusText}`
            })
          }
        }
      })

      // 上传错误
      xhr.addEventListener('error', () => {
        uploading.value = false
        error.value = '网络错误'
        resolve({
          success: false,
          error: '网络错误'
        })
      })

      // 打开连接并发送
      xhr.open('POST', url)
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.send(formData)
    })
  }

  const reset = () => {
    uploading.value = false
    progress.value = { loaded: 0, total: 0, percentage: 0 }
    error.value = null
  }

  return {
    uploading,
    progress,
    error,
    upload,
    reset
  }
}
