import type { FastifyPluginAsync } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { requireAuth } from '../middleware/auth.js'

const ALLOWED_ROOTS = (process.env.FILE_EXPLORER_ROOTS ?? '/opt,/var/log,/etc,/home,/root,/var/www')
  .split(',')
  .map((r) => r.trim().replace(/\/+$/, ''))

function isPathAllowed(p: string): boolean {
  return ALLOWED_ROOTS.some((root) => p === root || p.startsWith(root + '/'))
}

function resolveSafe(inputPath: string): string {
  const resolved = path.resolve('/', (inputPath || '/opt').replace(/^\/+/, ''))
  if (!isPathAllowed(resolved)) throw new Error(`Accès refusé : chemin hors des répertoires autorisés`)
  try {
    const real = fs.realpathSync(resolved)
    if (!isPathAllowed(real)) throw new Error(`Accès refusé : cible du lien symbolique hors des répertoires autorisés`)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
  }
  return resolved
}

function safeStat(filePath: string): fs.Stats | null {
  try { return fs.lstatSync(filePath) } catch { return null }
}

function safeRealStat(filePath: string): fs.Stats | null {
  try { return fs.statSync(filePath) } catch { return null }
}

// Valide un nom de fichier : pas de séparateurs de chemin ni null bytes
function isSafeFilename(name: string): boolean {
  return name.length > 0 && name.length <= 255 && !/[/\\\0]/.test(name)
}

export const filesRoutes: FastifyPluginAsync = async (app) => {
  // Parser binaire pour les uploads (appliqué uniquement aux routes de ce plugin)
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer' },
    (_req, body, done) => { done(null, body) },
  )

  app.addHook('preHandler', requireAuth)

  // GET /api/files/roots
  app.get('/roots', async (_req, reply) => {
    const accessible = ALLOWED_ROOTS.filter((r) => {
      const s = safeRealStat(r)
      return s?.isDirectory()
    })
    return reply.send({ roots: accessible })
  })

  // GET /api/files/list?path=
  app.get('/list', async (req, reply) => {
    const { path: inputPath = '/opt' } = req.query as { path?: string }
    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeRealStat(resolved)
    if (!stat) return reply.status(404).send({ error: 'Chemin introuvable' })
    if (!stat.isDirectory()) return reply.status(400).send({ error: 'Ce chemin est un fichier, pas un dossier' })

    let names: string[]
    try { names = fs.readdirSync(resolved) } catch {
      return reply.status(403).send({ error: 'Permission refusée (lecture du répertoire)' })
    }

    const entries = names
      .map((name) => {
        const full = path.join(resolved, name)
        const lstat = safeStat(full)
        if (!lstat) return null
        const rstat = lstat.isSymbolicLink() ? safeRealStat(full) : lstat
        return {
          name,
          isDir: rstat?.isDirectory() ?? false,
          isSymlink: lstat.isSymbolicLink(),
          size: rstat?.isFile() ? rstat.size : 0,
          mtime: (rstat ?? lstat).mtime.toISOString(),
          mode: (lstat.mode & 0o777).toString(8).padStart(3, '0'),
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.isDir !== b!.isDir) return a!.isDir ? -1 : 1
        return a!.name.localeCompare(b!.name)
      })

    const parentPath = path.dirname(resolved)
    const parent = resolved !== parentPath && isPathAllowed(parentPath) ? parentPath : null

    return reply.send({ path: resolved, parent, entries })
  })

  // GET /api/files/read?path=
  app.get('/read', async (req, reply) => {
    const { path: inputPath } = req.query as { path?: string }
    if (!inputPath) return reply.status(400).send({ error: 'Paramètre path requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeRealStat(resolved)
    if (!stat) return reply.status(404).send({ error: 'Fichier introuvable' })
    if (stat.isDirectory()) return reply.status(400).send({ error: 'Est un répertoire' })
    if (stat.size > 2 * 1024 * 1024) return reply.status(413).send({ error: 'Fichier trop volumineux (limite 2 Mo)' })

    try {
      const content = fs.readFileSync(resolved, 'utf8')
      return reply.send({ path: resolved, content, size: stat.size, mtime: stat.mtime.toISOString() })
    } catch {
      return reply.status(415).send({ error: 'Fichier binaire ou illisible' })
    }
  })

  // PUT /api/files/write
  app.put('/write', async (req, reply) => {
    const { path: inputPath, content } = req.body as { path?: string; content?: string }
    if (!inputPath || content === undefined) return reply.status(400).send({ error: 'path et content requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeRealStat(resolved)
    if (stat?.isDirectory()) return reply.status(400).send({ error: 'Est un répertoire' })
    if (content.length > 2 * 1024 * 1024) return reply.status(413).send({ error: 'Contenu trop volumineux (limite 2 Mo)' })

    try {
      fs.writeFileSync(resolved, content, 'utf8')
      return reply.send({ ok: true, path: resolved })
    } catch {
      return reply.status(500).send({ error: 'Écriture impossible' })
    }
  })

  // DELETE /api/files?path=
  app.delete('/', async (req, reply) => {
    const { path: inputPath } = req.query as { path?: string }
    if (!inputPath) return reply.status(400).send({ error: 'Paramètre path requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeStat(resolved)
    if (!stat) return reply.status(404).send({ error: 'Fichier introuvable' })
    if (stat.isDirectory()) return reply.status(400).send({ error: 'Suppression de répertoires désactivée' })

    try {
      fs.unlinkSync(resolved)
      return reply.send({ ok: true })
    } catch {
      return reply.status(500).send({ error: 'Suppression impossible' })
    }
  })

  // GET /api/files/download?path=
  app.get('/download', async (req, reply) => {
    const { path: inputPath } = req.query as { path?: string }
    if (!inputPath) return reply.status(400).send({ error: 'Paramètre path requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeRealStat(resolved)
    if (!stat) return reply.status(404).send({ error: 'Fichier introuvable' })
    if (stat.isDirectory()) return reply.status(400).send({ error: 'Est un répertoire' })
    if (stat.size > 500 * 1024 * 1024) return reply.status(413).send({ error: 'Fichier trop volumineux (limite 500 Mo)' })

    const filename = path.basename(resolved)
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Length', stat.size)
    return reply.send(fs.createReadStream(resolved))
  })

  // POST /api/files/upload?path=/dest/dir&name=filename.txt  (body: application/octet-stream)
  app.post('/upload', { bodyLimit: 100 * 1024 * 1024 }, async (req, reply) => {
    const { path: destDir, name } = req.query as { path?: string; name?: string }
    if (!destDir || !name) return reply.status(400).send({ error: 'Paramètres path et name requis' })
    if (!isSafeFilename(name)) return reply.status(400).send({ error: 'Nom de fichier invalide' })

    const targetPath = path.join(destDir, name)
    let resolved: string
    try { resolved = resolveSafe(targetPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const body = req.body as Buffer
    if (!Buffer.isBuffer(body)) return reply.status(400).send({ error: 'Corps de requête invalide (binary attendu)' })
    if (body.length > 100 * 1024 * 1024) return reply.status(413).send({ error: 'Fichier trop volumineux (limite 100 Mo)' })

    try {
      fs.writeFileSync(resolved, body)
      return reply.send({ ok: true, path: resolved, size: body.length })
    } catch {
      return reply.status(500).send({ error: 'Écriture impossible' })
    }
  })

  // POST /api/files/mkdir  body: { path }
  app.post('/mkdir', async (req, reply) => {
    const { path: inputPath } = req.body as { path?: string }
    if (!inputPath) return reply.status(400).send({ error: 'Paramètre path requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    if (fs.existsSync(resolved)) return reply.status(409).send({ error: 'Ce chemin existe déjà' })

    try {
      fs.mkdirSync(resolved)
      return reply.send({ ok: true, path: resolved })
    } catch {
      return reply.status(500).send({ error: 'Création du dossier impossible' })
    }
  })

  // POST /api/files/rename  body: { from, to }
  app.post('/rename', async (req, reply) => {
    const { from, to } = req.body as { from?: string; to?: string }
    if (!from || !to) return reply.status(400).send({ error: 'Paramètres from et to requis' })

    let fromResolved: string
    let toResolved: string
    try { fromResolved = resolveSafe(from) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }
    try { toResolved = resolveSafe(to) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    if (!fs.existsSync(fromResolved)) return reply.status(404).send({ error: 'Source introuvable' })
    if (fs.existsSync(toResolved)) return reply.status(409).send({ error: 'Destination existe déjà' })

    try {
      fs.renameSync(fromResolved, toResolved)
      return reply.send({ ok: true, from: fromResolved, to: toResolved })
    } catch {
      return reply.status(500).send({ error: 'Renommage impossible' })
    }
  })

  // GET /api/files/du?path=  — taille récursive d'un dossier (BusyBox du -sk)
  app.get('/du', async (req, reply) => {
    const { path: inputPath } = req.query as { path?: string }
    if (!inputPath) return reply.status(400).send({ error: 'Paramètre path requis' })

    let resolved: string
    try { resolved = resolveSafe(inputPath) } catch (e) {
      return reply.status(403).send({ error: (e as Error).message })
    }

    const stat = safeRealStat(resolved)
    if (!stat?.isDirectory()) return reply.status(400).send({ error: 'Ce chemin n\'est pas un répertoire' })

    const bytes = await new Promise<number>((resolve) => {
      // BusyBox du -sk retourne des blocs de 1024 octets
      execFile('du', ['-sk', resolved], { timeout: 15000 }, (err, stdout) => {
        if (err) { resolve(0); return }
        const kb = parseInt(stdout.split('\t')[0], 10)
        resolve(isNaN(kb) ? 0 : kb * 1024)
      })
    })

    return reply.send({ path: resolved, bytes })
  })
}
