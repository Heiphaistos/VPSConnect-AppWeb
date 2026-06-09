import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { cache } from '../jobs/collector.js'
import type { HistoryResponse, MetricPoint } from '../types.js'

const VM_URL = process.env.VM_URL ?? 'http://localhost:8428'

interface HistoryQuery {
  metric: string
  start?: string
  end?: string
  step?: string
}

async function queryVm(query: string, start: number, end: number, step: number): Promise<MetricPoint[]> {
  const url = new URL(`${VM_URL}/api/v1/query_range`)
  url.searchParams.set('query', query)
  url.searchParams.set('start', String(start))
  url.searchParams.set('end', String(end))
  url.searchParams.set('step', String(step))

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = (await res.json()) as {
    status: string
    data: { result: Array<{ values: [number, string][] }> }
  }
  if (data.status !== 'success' || !data.data.result.length) return []
  return data.data.result[0].values.map(([ts, v]) => ({ timestamp: ts * 1000, value: parseFloat(v) }))
}

const METRIC_QUERIES: Record<string, string> = {
  cpu: 'vps_cpu_usage_percent',
  memory: 'vps_memory_percent',
  net_in: 'vps_net_rx_sec',
  net_out: 'vps_net_tx_sec',
  load: 'vps_load_1m',
}

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // Current snapshot (from in-memory cache — ultra fast)
  app.get('/snapshot', async (_req, reply) => {
    if (!cache.system) return reply.status(503).send({ error: 'Collecting...' })
    return reply.send({
      system: cache.system,
      containers: cache.containers,
      processes: cache.processes,
      updatedAt: cache.updatedAt,
    })
  })

  // Historical time-series from VictoriaMetrics
  app.get<{ Querystring: HistoryQuery }>('/history', async (req, reply) => {
    const { metric, start, end, step } = req.query

    if (!metric || !METRIC_QUERIES[metric]) {
      return reply.status(400).send({ error: `Unknown metric. Valid: ${Object.keys(METRIC_QUERIES).join(', ')}` })
    }

    const endTs = end ? Number(end) : Math.floor(Date.now() / 1000)
    const startTs = start ? Number(start) : endTs - 3600 // default: last 1h
    const stepVal = step ? Number(step) : 15

    try {
      const points = await queryVm(METRIC_QUERIES[metric], startTs, endTs, stepVal)
      const response: HistoryResponse = { metric, points }
      return reply.send(response)
    } catch (err) {
      return reply.status(502).send({ error: 'VictoriaMetrics unavailable' })
    }
  })
}
