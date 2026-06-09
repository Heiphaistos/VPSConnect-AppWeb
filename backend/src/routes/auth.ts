import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { redis } from '../redis.js'
import type { AuthSession } from '../types.js'

const SESSION_TTL = 60 * 60 * 24 // 24h

interface LoginBody {
  password: string
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', minLength: 1, maxLength: 128 },
        },
      },
    },
  }, async (req, reply) => {
    const { password } = req.body
    const hash = process.env.ADMIN_PASSWORD_HASH ?? ''

    const valid = await bcrypt.compare(password, hash)
    if (!valid) {
      await new Promise((r) => setTimeout(r, 400)) // timing attack mitigation
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const sessionId = randomUUID()
    const session: AuthSession = {
      sessionId,
      ip: req.ip,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL * 1000,
    }

    await redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', SESSION_TTL)

    const token = jwt.sign({ sessionId }, process.env.JWT_SECRET ?? '', { expiresIn: '24h' })

    reply
      .setCookie('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL,
        path: '/',
      })
      .send({ ok: true })
  })

  app.post('/logout', async (req, reply) => {
    const token = req.cookies['session']
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as { sessionId: string }
        await redis.del(`session:${payload.sessionId}`)
      } catch { /* expired token — still clear the cookie */ }
    }
    reply.clearCookie('session', { path: '/' }).send({ ok: true })
  })

  app.get('/me', async (req, reply) => {
    const token = req.cookies['session']
    if (!token) return reply.status(401).send({ error: 'Not authenticated' })
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as { sessionId: string }
      const raw = await redis.get(`session:${payload.sessionId}`)
      if (!raw) return reply.status(401).send({ error: 'Session expired' })
      return reply.send({ authenticated: true, sessionId: payload.sessionId })
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  })
}
