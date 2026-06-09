import type { FastifyPluginAsync } from 'fastify'
import type { WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { redis } from '../redis.js'
import { streamContainerLogs } from '../collectors/docker.js'
import { streamPm2Logs } from '../collectors/pm2.js'

async function isAuthenticated(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as { sessionId: string }
    const session = await redis.get(`session:${payload.sessionId}`)
    return session !== null
  } catch {
    return false
  }
}

export const logsRoutes: FastifyPluginAsync = async (app) => {
  // Docker container log stream
  app.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/logs/docker/:id',
    { websocket: true },
    async (connection: { socket: WebSocket }, req) => {
      const { token } = req.query
      const cookieToken = req.cookies?.['session']

      if (!(await isAuthenticated(token ?? cookieToken))) {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        connection.socket.close(1008, 'Unauthorized')
        return
      }

      const { id } = req.params
      let stopped = false

      const stop = streamContainerLogs(
        id,
        (chunk) => {
          if (!stopped && connection.socket.readyState === 1) {
            connection.socket.send(JSON.stringify({ type: 'log', data: chunk }))
          }
        },
        () => {
          if (!stopped && connection.socket.readyState === 1) {
            connection.socket.send(JSON.stringify({ type: 'end' }))
          }
        },
      )

      connection.socket.on('close', () => {
        stopped = true
        stop()
      })

      connection.socket.on('error', () => {
        stopped = true
        stop()
      })
    },
  )

  // PM2 process log stream
  app.get<{ Params: { name: string }; Querystring: { token?: string } }>(
    '/logs/pm2/:name',
    { websocket: true },
    async (connection: { socket: WebSocket }, req) => {
      const { token } = req.query
      const cookieToken = req.cookies?.['session']

      if (!(await isAuthenticated(token ?? cookieToken))) {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        connection.socket.close(1008, 'Unauthorized')
        return
      }

      const { name } = req.params
      let stopped = false
      let stopFn: (() => void) | null = null

      streamPm2Logs(
        name,
        (line) => {
          if (!stopped && connection.socket.readyState === 1) {
            connection.socket.send(JSON.stringify({ type: 'log', data: line }))
          }
        },
        () => {
          if (!stopped && connection.socket.readyState === 1) {
            connection.socket.send(JSON.stringify({ type: 'end' }))
          }
        },
      ).then((stop) => {
        stopFn = stop
      })

      connection.socket.on('close', () => {
        stopped = true
        stopFn?.()
      })

      connection.socket.on('error', () => {
        stopped = true
        stopFn?.()
      })
    },
  )
}
