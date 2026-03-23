import crypto from 'crypto'

export function generateFileHash(content: Buffer, filename: string): string {
  const hash = crypto.createHash('md5')
  hash.update(content)
  return hash.digest('hex')
}

export function generateTrackId(filename: string, fileSize: number): string {
  const hash = crypto.createHash('md5')
  hash.update(`${filename}:${fileSize}`)
  return hash.digest('hex').substring(0, 16)
}
