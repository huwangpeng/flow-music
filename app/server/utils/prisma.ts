import { PrismaClient } from '@prisma/client'
import { getDatabasePath } from './paths'

const dbPath = getDatabasePath()
console.log('[Prisma] Using database at:', dbPath)

export const prisma = new PrismaClient({
  datasourceUrl: `file:${dbPath}`
})