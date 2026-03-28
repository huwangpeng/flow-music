import { dirname, join, normalize } from 'path'
import { promises as fs } from 'fs'
import { prisma } from '~/server/utils/prisma'
import { getCoverPath, getLyricsPath, getMusicPath, getStoragePath } from '~/server/utils/paths'
import { saveLyricsLocally } from '~/server/utils/lyrics'
import type { AudioTrack } from '~/types/audio'
import type {
  ScriptDownloadTask,
  ScriptHostActionMap,
  ScriptHostActionName
} from '~/types/script-host-actions'
import { getScriptActions, listScriptLogs } from '~/server/utils/script-registry'

const downloadTasks = new Map<string, ScriptDownloadTask>()

function resolveBasePath(base?: 'storage' | 'music' | 'lyrics' | 'covers') {
  if (base === 'music') return getMusicPath()
  if (base === 'lyrics') return getLyricsPath()
  if (base === 'covers') return getCoverPath()
  return getStoragePath()
}

function safeJoin(basePath: string, relativePath = '') {
  const target = normalize(join(basePath, relativePath))
  const normalizedBase = normalize(basePath)
  if (!target.startsWith(normalizedBase)) {
    throw new Error('非法路径访问')
  }
  return target
}

function mapTrack(track: any): AudioTrack {
  return {
    id: track.uuid,
    uuid: track.uuid,
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumArtist: track.albumArtist,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
    year: track.year,
    genre: track.genre,
    duration: track.duration,
    bitrate: track.bitrate,
    sampleRate: track.sampleRate,
    channels: track.channels,
    format: track.format,
    filePath: track.filePath,
    fileSize: track.fileSize,
    coverArtId: track.coverArtId,
    coverUrl: track.coverArtId ? `/api/cover/${track.coverArtId}` : null,
    lyrics: track.lyrics,
    userId: track.userId,
    tags: track.tags ? JSON.parse(track.tags) : {},
    createdAt: track.createdAt.toISOString(),
    updatedAt: track.updatedAt.toISOString()
  }
}

export const scriptHostActionHandlers: {
  [K in ScriptHostActionName]: (
    scriptId: string,
    payload: ScriptHostActionMap[K]['payload']
  ) => Promise<ScriptHostActionMap[K]['result']>
} = {
  'library.track.list': async (_scriptId, payload) => {
    const keyword = payload.keyword?.trim()
    const limit = Math.min(payload.limit || 50, 100)
    const offset = Math.max(payload.offset || 0, 0)

    const where = keyword
      ? {
          OR: [
            { title: { contains: keyword } },
            { artist: { contains: keyword } },
            { album: { contains: keyword } }
          ]
        }
      : undefined

    const [items, total] = await Promise.all([
      prisma.audioTrack.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.audioTrack.count({ where })
    ])

    return {
      items: items.map(mapTrack),
      total
    }
  },
  'library.track.upsert': async (_scriptId, payload) => {
    const existing = await prisma.audioTrack.findFirst({ where: { uuid: payload.track.uuid } })
    const track = await prisma.audioTrack.upsert({
      where: { uuid: payload.track.uuid },
      update: {
        title: payload.track.title,
        artist: payload.track.artist,
        album: payload.track.album,
        albumArtist: payload.track.albumArtist,
        trackNumber: payload.track.trackNumber,
        discNumber: payload.track.discNumber,
        year: payload.track.year,
        genre: payload.track.genre,
        duration: payload.track.duration,
        bitrate: payload.track.bitrate,
        sampleRate: payload.track.sampleRate,
        channels: payload.track.channels,
        format: payload.track.format,
        filePath: payload.track.filePath,
        fileSize: payload.track.fileSize,
        coverArtId: payload.track.coverArtId,
        lyrics: typeof payload.track.lyrics === 'string' ? payload.track.lyrics : undefined,
        userId: payload.track.userId,
        tags: payload.track.tags ? JSON.stringify(payload.track.tags) : undefined
      },
      create: {
        uuid: payload.track.uuid,
        title: payload.track.title || '未知标题',
        artist: payload.track.artist || '未知艺术家',
        format: payload.track.format || 'mp3',
        filePath: payload.track.filePath || '',
        fileSize: payload.track.fileSize || 0,
        album: payload.track.album,
        albumArtist: payload.track.albumArtist,
        trackNumber: payload.track.trackNumber,
        discNumber: payload.track.discNumber,
        year: payload.track.year,
        genre: payload.track.genre,
        duration: payload.track.duration || 0,
        bitrate: payload.track.bitrate,
        sampleRate: payload.track.sampleRate,
        channels: payload.track.channels,
        coverArtId: payload.track.coverArtId,
        lyrics: typeof payload.track.lyrics === 'string' ? payload.track.lyrics : undefined,
        userId: payload.track.userId || 'default',
        tags: payload.track.tags ? JSON.stringify(payload.track.tags) : undefined
      }
    })

    return {
      track: mapTrack(track),
      created: !existing
    }
  },
  'library.track.delete': async (_scriptId, payload) => {
    const track = await prisma.audioTrack.findFirst({ where: { uuid: payload.uuid } })
    if (!track) {
      throw new Error('曲目不存在')
    }
    await prisma.audioTrack.delete({ where: { uuid: payload.uuid } })
    if (payload.deleteFile !== false) {
      await fs.rm(join(getMusicPath(), `${payload.uuid}.${track.format}`), { force: true })
    }
    if (payload.deleteCover && track.coverArtId) {
      await fs.rm(join(getCoverPath(), `${track.coverArtId}.jpg`), { force: true })
    }
    return {
      success: true,
      uuid: payload.uuid
    }
  },
  'library.track.updateLyrics': async (_scriptId, payload) => {
    await saveLyricsLocally(payload.uuid, payload.lyrics)
    await prisma.audioTrack.update({
      where: { uuid: payload.uuid },
      data: { lyrics: payload.lyrics }
    })
    return {
      uuid: payload.uuid,
      saved: true
    }
  },
  'files.list': async (_scriptId, payload) => {
    const basePath = resolveBasePath(payload.base)
    const targetDir = safeJoin(basePath, payload.directory)
    const files = await fs.readdir(targetDir, { withFileTypes: true })
    return files.map(file => ({
      name: file.name,
      type: file.isDirectory() ? 'directory' : 'file'
    }))
  },
  'files.writeText': async (_scriptId, payload) => {
    const basePath = resolveBasePath(payload.base === 'lyrics' ? 'lyrics' : 'storage')
    const targetPath = safeJoin(basePath, payload.path)
    await fs.mkdir(dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, payload.content, 'utf-8')
    return {
      path: payload.path
    }
  },
  'files.transcode': async (_scriptId, payload) => {
    return {
      accepted: true,
      filename: payload.filename,
      message: `已接受 ${payload.filename} 的转码请求，当前输出格式：${payload.outputFormat || '原格式'}`
    }
  },
  'download.create': async (scriptId, payload) => {
    const task: ScriptDownloadTask = {
      id: `download-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scriptId,
      url: payload.url,
      targetPath: payload.targetPath,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    downloadTasks.set(task.id, task)

    void (async () => {
      try {
        task.status = 'running'
        task.updatedAt = new Date().toISOString()
        const response = await fetch(payload.url, {
          headers: payload.headers
        })
        if (!response.ok) {
          throw new Error(`下载失败，状态码 ${response.status}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        const targetPath = safeJoin(getStoragePath(), payload.targetPath)
        await fs.mkdir(dirname(targetPath), { recursive: true })
        await fs.writeFile(targetPath, buffer)
        task.status = 'completed'
        task.updatedAt = new Date().toISOString()
      } catch (error: any) {
        task.status = 'failed'
        task.error = error.message || '下载失败'
        task.updatedAt = new Date().toISOString()
      }
    })()

    return task
  },
  'download.get': async (_scriptId, payload) => {
    const task = downloadTasks.get(payload.taskId)
    if (!task) {
      throw new Error('下载任务不存在')
    }
    return task
  },
  'download.list': async (_scriptId, payload) => {
    const items = Array.from(downloadTasks.values())
    return payload.status ? items.filter(item => item.status === payload.status) : items
  },
  'network.fetch': async (_scriptId, payload) => {
    const response = await fetch(payload.url, {
      method: payload.method || 'GET',
      headers: payload.headers,
      body: payload.body
    })
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    }
  },
  'scripts.describeActions': async (scriptId) => {
    return getScriptActions(scriptId)
  },
  'logs.query': async (scriptId, payload) => {
    const logs = listScriptLogs(scriptId)
    return typeof payload.limit === 'number' ? logs.slice(0, payload.limit) : logs
  }
}
