import type { ScriptPackageInstallResult } from '~/types/script-packages'

export function useScriptPackageUpload() {
  async function installPackage(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    return await $fetch<{ success: boolean; data?: ScriptPackageInstallResult; error?: string }>('/api/scripts/packages/install', {
      method: 'POST',
      body: formData
    })
  }

  return {
    installPackage
  }
}
