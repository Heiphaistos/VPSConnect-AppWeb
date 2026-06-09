import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { cache } from '../jobs/collector.js'

export const pm2Routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/processes', async (_req, reply) => {
    return reply.send({ processes: cache.processes, updatedAt: cache.updatedAt })
  })
}
