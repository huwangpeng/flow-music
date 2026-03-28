import type { ScriptManifest, ScriptPageDefinition, ScriptSourceType } from '~/types/scripts'

export type ScriptPackageSourceType = ScriptSourceType | 'package'

export interface ScriptPackageInfo {
  formatVersion: '1'
  packageType: 'nuxt-script-plugin'
  entry?: string
  integrity?: string
  extractedSize?: number
}

export interface ScriptPageAssetDefinition extends ScriptPageDefinition {
  entryHtml: string
  clientEntry?: string
  mountMode: 'iframe'
  sandbox?: Array<'allow-scripts' | 'allow-forms' | 'allow-downloads' | 'allow-modals'>
}

export interface ScriptPackageManifest extends Omit<ScriptManifest, 'sourceType' | 'pages'> {
  sourceType: ScriptPackageSourceType
  package: ScriptPackageInfo
  icon?: string
  minHostVersion?: string
  pages?: ScriptPageAssetDefinition[]
}

export interface InstalledScriptPackage {
  manifest: ScriptPackageManifest
  installPath: string
  installedAt: string
}

export interface ScriptPackageInstallResult {
  scriptId: string
  version: string
  manifest: ScriptPackageManifest
  extractedPath: string
  mountedPages: Array<{
    pageId: string
    publicUrl: string
  }>
  warnings: string[]
}
