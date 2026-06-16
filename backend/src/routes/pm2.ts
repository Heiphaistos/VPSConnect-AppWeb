import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { cache } from '../jobs/collector.js'
import { startProcess, stopProcess, restartProcess } from '../collectors/pm2.js'

export const pm2Routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/processes', async (_req, reply) => {
    const processes = cache.processes.map(({ logFile: _lf, errFile: _ef, ...p }) => p)
    return reply.send({ processes, updatedAt: cache.updatedAt })
  })

  app.post('/processes/:name/start', async (req, reply) => {
    const { name } = req.params as { name: string }
    await startProcess(name)
    return reply.send({ ok: true })
  })

  app.post('/processes/:name/stop', async (req, reply) => {
    const { name } = req.params as { name: string }
    await stopProcess(name)
    return reply.send({ ok: true })
  })

  app.post('/processes/:name/restart', async (req, reply) => {
    const { name } = req.params as { name: string }
    await restartProcess(name)
    return reply.send({ ok: true })
  })
}
