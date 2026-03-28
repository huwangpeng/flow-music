import AdmZip from 'adm-zip'
import { createHash } from 'crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join, normalize } from 'path'
import { createError } from 'h3'
import type { ScriptPackageInstallResult, ScriptPackageManifest } from '~/types/script-packages'
import { ensureScriptPackageRoot, getScriptPackagePublicBase, getScriptPackageVersionPath } from '~/server/utils/script-package-paths'
import { upsertInstalledScriptRecord } from '~/server/utils/script-package-index'

function validatePackageManifest(manifest: any): ScriptPackageManifest {
  if (!manifest?.id || !manifest?.name || !manifest?.version) {
    throw createError({ statusCode: 400, message: '插件包 manifest 缺少必要字段' })
  }

  if (manifest.sourceType !== 'package') {
    throw createError({ statusCode: 400, message: '插件包 sourceType 必须为 package' })
  }

  if (!manifest.package || manifest.package.packageType !== 'nuxt-script-plugin') {
    throw createError({ statusCode: 400, message: '插件包格式无效' })
  }

  return manifest as ScriptPackageManifest
}

function safeJoin(basePath: string, relativePath: string) {
  const target = normalize(join(basePath, relativePath))
  const base = normalize(basePath)
  if (!target.startsWith(base)) {
    throw createError({ statusCode: 400, message: '插件包包含非法路径' })
  }
  return target
}

export function computePackageIntegrity(buffer: Buffer) {
  return `sha256-${createHash('sha256').update(buffer).digest('base64')}`
}

export async function installScriptPackageFromBuffer(fileName: string, buffer: Buffer): Promise<ScriptPackageInstallResult> {
  const tempPath = await mkdtemp(join(tmpdir(), 'flow-script-package-'))

  try {
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()

    for (const entry of entries) {
      const entryPath = safeJoin(tempPath, entry.entryName)
      if (entry.isDirectory) {
        await mkdir(entryPath, { recursive: true })
        continue
      }
      await mkdir(dirname(entryPath), { recursive: true })
      await writeFile(entryPath, entry.getData())
    }

    const manifestPath = join(tempPath, 'manifest.json')
    const manifestRaw = await readFile(manifestPath, 'utf-8').catch(() => '')
    if (!manifestRaw) {
      throw createError({ statusCode: 400, message: '插件包缺少 manifest.json' })
    }

    const manifest = validatePackageManifest(JSON.parse(manifestRaw))
    const targetPath = getScriptPackageVersionPath(manifest.id, manifest.version)
    await ensureScriptPackageRoot()
    await mkdir(targetPath, { recursive: true })
    await cp(tempPath, targetPath, { recursive: true, force: true })

    const result = {
      scriptId: manifest.id,
      version: manifest.version,
      manifest: {
        ...manifest,
        package: {
          ...manifest.package,
          integrity: computePackageIntegrity(buffer),
          extractedSize: buffer.byteLength
        }
      },
      extractedPath: targetPath,
      mountedPages: (manifest.pages || []).map(page => ({
        pageId: page.id,
        publicUrl: `${getScriptPackagePublicBase(manifest.id, manifest.version)}/${page.entryHtml}`
      })),
      warnings: []
    }

    await upsertInstalledScriptRecord({
      manifest: result.manifest,
      installedAt: new Date().toISOString(),
      extractedPath: targetPath
    })

    return result
  } finally {
    await rm(tempPath, { recursive: true, force: true })
  }
}
