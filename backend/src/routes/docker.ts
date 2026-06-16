import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { cache } from '../jobs/collector.js'
import { startContainer, stopContainer, restartContainer } from '../collectors/docker.js'

export const dockerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/containers', async (_req, reply) => {
    return reply.send({ containers: cache.containers, updatedAt: cache.updatedAt })
  })

  app.post('/containers/:id/start', async (req, reply) => {
    const { id } = req.params as { id: string }
    await startContainer(id)
    return reply.send({ ok: true })
  })

  app.post('/containers/:id/stop', async (req, reply) => {
    const { id } = req.params as { id: string }
    await stopContainer(id)
    return reply.send({ ok: true })
  })

  app.post('/containers/:id/restart', async (req, reply) => {
    const { id } = req.params as { id: string }
    await restartContainer(id)
    return reply.send({ ok: true })
  })
}
