import type { FastifyPluginAsync } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import { requireAuth } from '../middleware/auth.js'

// Directories accessible via the file explorer
const ALLOWED_ROOTS = (process.env.FILE_EXPLORER_ROOTS ?? '/opt,/var/log,/etc/nginx,/root/.pm2/logs,/var/www,/home')
  .split(',')
  .map((r) => r.trim())

function resolveSafe(inputPath: string): string {
  // Normalize and resolve the path
  const resolved = path.resolve('/', (inputPath || '/opt').replace(/^\/+/, ''))
  const allowed = ALLOWED_ROOTS.some((root) => resolved === root || resolved.startsWith(root + '/'))
  if (!allowed) throw new Error(`Accès refusé : ${resolved}`)
  return resolved
}

function safeStat(filePath: string) {
  try { return fs.statSync(filePath) } catch { return null }
}

export const filesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // List directory — GET /api/files/list?path=/opt/myapp
  app.get('/list', async (req, reply) => {
    const { path: inputPath = '/opt' } = req.query as { path?: string }
    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeStat(resolved)
    if (!stat) return reply.status(404).send({ error: 'Chemin introuvable' })
    if (!stat.isDirectory()) return reply.status(400).send({ error: 'Ce chemin est un fichier, pas un dossier' })

    let names: string[]
    try { names = fs.readdirSync(resolved) } catch {
      return reply.status(403).send({ error: 'Permission refusée' })
    }

    const entries = names
      .map((name) => {
        const full = path.join(resolved, name)
        const s = safeStat(full)
        if (!s) return null
        return {
          name,
          isDir: s.isDirectory(),
          isSymlink: s.isSymbolicLink(),
          size: s.isFile() ? s.size : 0,
          mtime: s.mtime.toISOString(),
          mode: (s.mode & 0o777).toString(8),
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.isDir !== b!.isDir) return a!.isDir ? -1 : 1
        return a!.name.localeCompare(b!.name)
      })

    return reply.send({ path: resolved, parent: path.dirname(resolved), entries })
  })

  // Read file content — GET /api/files/read?path=/opt/myapp/config.yml
  app.get('/read', async (req, reply) => {
    const { path: inputPath } = req.query as { path?: string }
    if (!inputPath) return reply.status(400).send({ error: 'path requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeStat(resolved)
    if (!stat) return reply.status(404).send({ error: 'Fichier introuvable' })
    if (stat.isDirectory()) return reply.status(400).send({ error: 'Est un dossier' })
    if (stat.size > 2 * 1024 * 1024) return reply.status(413).send({ error: 'Fichier trop volumineux (>2MB)' })

    try {
      const content = fs.readFileSync(resolved, 'utf8')
      return reply.send({ path: resolved, content, size: stat.size, mtime: stat.mtime.toISOString() })
    } catch {
      return reply.status(500).send({ error: 'Impossible de lire le fichier' })
    }
  })

  // Allowed roots list — GET /api/files/roots
  app.get('/roots', async (_req, reply) => {
    return reply.send({ roots: ALLOWED_ROOTS })
  })
}
