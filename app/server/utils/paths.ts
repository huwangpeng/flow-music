import { join, resolve } from 'path'
import { existsSync } from 'fs'

let _projectRoot: string | null = null

export function findProjectRoot(): string {
  if (_projectRoot) return _projectRoot

  const markers = ['package.json', 'nuxt.config.ts', 'app']
  
  const possiblePaths = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '..', '..'),
    resolve(process.cwd(), '..', '..', '..'),
  ]

  for (const p of possiblePaths) {
    for (const marker of markers) {
      if (existsSync(join(p, marker))) {
        _projectRoot = p
        console.log('[PathUtils] Found project root at:', p)
        return p
      }
    }
  }

  _projectRoot = process.cwd()
  return _projectRoot
}

export function getStoragePath(): string {
  return join(findProjectRoot(), 'storage')
}

export function getDataPath(): string {
  return join(findProjectRoot(), 'data')
}

export function getMusicPath(): string {
  return join(getStoragePath(), 'music')
}

export function getCoverPath(): string {
  return join(getStoragePath(), 'covers')
}

export function getLyricsPath(): string {
  return join(getStoragePath(), 'lyrics')
}

export function getDatabasePath(): string {
  return join(getDataPath(), 'flow-music.db')
}