import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import websocket from '@fastify/websocket'
import { redis } from './redis.js'
import { authRoutes } from './routes/auth.js'
import { metricsRoutes } from './routes/metrics.js'
import { dockerRoutes } from './routes/docker.js'
import { pm2Routes } from './routes/pm2.js'
import { logsRoutes } from './routes/logs.js'
import { startCollector } from './jobs/collector.js'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
  trustProxy: true,
})

await redis.connect()

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
})

await app.register(cookie, {
  secret: process.env.JWT_SECRET ?? 'fallback-secret',
})

await app.register(websocket, {
  options: {
    maxPayload: 1048576,
  },
})

// Health check (no auth)
app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

// Auth routes (no auth middleware)
await app.register(authRoutes, { prefix: '/api/auth' })

// Protected routes — auth checked inside each plugin
await app.register(metricsRoutes, { prefix: '/api/metrics' })
await app.register(dockerRoutes, { prefix: '/api/docker' })
await app.register(pm2Routes, { prefix: '/api/pm2' })
await app.register(logsRoutes, { prefix: '/ws' })

// Start background metric collector
startCollector()

const port = Number(process.env.PORT ?? 4000)
await app.listen({ port, host: '0.0.0.0' })
console.info(`[VPSConnect] Backend listening on :${port}`)
