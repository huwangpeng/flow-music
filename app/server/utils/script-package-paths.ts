import { join } from 'path'
import { mkdir } from 'fs/promises'

const SCRIPT_PACKAGE_ROOT = join(process.cwd(), '.data', 'script-packages')

export async function ensureScriptPackageRoot() {
  await mkdir(SCRIPT_PACKAGE_ROOT, { recursive: true })
  return SCRIPT_PACKAGE_ROOT
}

export function getScriptPackageVersionPath(scriptId: string, version: string) {
  return join(SCRIPT_PACKAGE_ROOT, scriptId, version)
}

export function getScriptPackagePublicBase(scriptId: string, version: string) {
  return `/api/scripts/packages/${encodeURIComponent(scriptId)}/${encodeURIComponent(version)}`
}
