import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ScriptPackageManifest } from '~/types/script-packages'

const SCRIPT_INDEX_ROOT = join(process.cwd(), '.data', 'script-packages')
const SCRIPT_INDEX_FILE = join(SCRIPT_INDEX_ROOT, 'index.json')

export interface InstalledScriptRecord {
  manifest: ScriptPackageManifest
  installedAt: string
  extractedPath: string
}

async function ensureIndexRoot() {
  await mkdir(SCRIPT_INDEX_ROOT, { recursive: true })
}

export async function readInstalledScriptRecords() {
  await ensureIndexRoot()
  if (!existsSync(SCRIPT_INDEX_FILE)) {
    return [] as InstalledScriptRecord[]
  }

  try {
    const raw = await readFile(SCRIPT_INDEX_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as InstalledScriptRecord[] : []
  } catch {
    return [] as InstalledScriptRecord[]
  }
}

export async function writeInstalledScriptRecords(records: InstalledScriptRecord[]) {
  await ensureIndexRoot()
  await writeFile(SCRIPT_INDEX_FILE, JSON.stringify(records, null, 2), 'utf-8')
}

export async function upsertInstalledScriptRecord(record: InstalledScriptRecord) {
  const records = await readInstalledScriptRecords()
  const index = records.findIndex(item => item.manifest.id === record.manifest.id)

  if (index >= 0) {
    records[index] = record
  } else {
    records.push(record)
  }

  await writeInstalledScriptRecords(records)
}
