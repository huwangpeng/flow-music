import { defineEventHandler } from 'h3'
import { readInstalledScriptRecords } from '~/server/utils/script-package-index'

export default defineEventHandler(async () => {
  const records = await readInstalledScriptRecords()
  return records.map(record => ({
    manifest: record.manifest,
    installedAt: record.installedAt,
    extractedPath: record.extractedPath
  }))
})
