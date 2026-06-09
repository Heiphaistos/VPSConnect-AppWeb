import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { cache } from '../jobs/collector.js'

export const dockerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/containers', async (_req, reply) => {
    return reply.send({ containers: cache.containers, updatedAt: cache.updatedAt })
  })
}
