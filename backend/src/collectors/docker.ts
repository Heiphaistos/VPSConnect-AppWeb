import http from 'node:http'
import type { Container, ContainerState } from '../types.js'

const SOCKET = '/var/run/docker.sock'

function dockerRequest(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: SOCKET, path, method: 'GET', headers: { Host: 'localhost' } },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
          catch (e) { reject(e) }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

function mapState(status: string, exitCode?: number): ContainerState {
  if (status === 'running') return 'deployed'
  if (status === 'restarting' || status === 'created' || status === 'paused') return 'pending'
  if (status === 'exited' && exitCode === 0) return 'pending'
  return 'failed'
}

interface RawContainer {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
  RestartCount?: number
  Ports?: Array<{ PublicPort?: number; PrivatePort: number; Type: string }>
  Created: number
}

interface DockerStats {
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus?: number }
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number }
  memory_stats: { usage?: number; limit?: number }
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>
}

async function getContainerStats(id: string): Promise<{ cpu: number; memUsage: number; memLimit: number; netIn: number; netOut: number }> {
  try {
    const stats = await dockerRequest(`/containers/${id}/stats?stream=false`) as DockerStats
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
    const sysDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
    const numCpus = stats.cpu_stats.online_cpus ?? 1
    const cpu = sysDelta > 0 ? (cpuDelta / sysDelta) * numCpus * 100 : 0

    const memUsage = stats.memory_stats.usage ?? 0
    const memLimit = stats.memory_stats.limit ?? 0

    let netIn = 0, netOut = 0
    if (stats.networks) {
      for (const n of Object.values(stats.networks)) {
        netIn += n.rx_bytes
        netOut += n.tx_bytes
      }
    }
    return { cpu: Math.min(cpu, 100), memUsage, memLimit, netIn, netOut }
  } catch {
    return { cpu: 0, memUsage: 0, memLimit: 0, netIn: 0, netOut: 0 }
  }
}

export async function listContainers(): Promise<Container[]> {
  const raw = await dockerRequest('/containers/json?all=true') as RawContainer[]

  const containers = await Promise.all(
    raw.map(async (c): Promise<Container> => {
      const stats = c.State === 'running' ? await getContainerStats(c.Id) : { cpu: 0, memUsage: 0, memLimit: 0, netIn: 0, netOut: 0 }
      const ports = (c.Ports ?? [])
        .filter((p) => p.PublicPort)
        .map((p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`)

      return {
        id: c.Id,
        shortId: c.Id.slice(0, 12),
        name: (c.Names[0] ?? '').replace(/^\//, ''),
        image: c.Image,
        status: c.State,
        state: mapState(c.State),
        cpuPercent: Number(stats.cpu.toFixed(2)),
        memoryUsage: stats.memUsage,
        memoryLimit: stats.memLimit,
        memoryPercent: stats.memLimit > 0 ? Number(((stats.memUsage / stats.memLimit) * 100).toFixed(1)) : 0,
        networkIn: stats.netIn,
        networkOut: stats.netOut,
        restartCount: c.RestartCount ?? 0,
        startedAt: new Date(c.Created * 1000).toISOString(),
        ports,
      }
    }),
  )

  return containers
}

export function streamContainerLogs(
  id: string,
  onData: (chunk: string) => void,
  onEnd: () => void,
  since?: number,
): () => void {
  const sinceParam = since ? `&since=${since}` : '&since=0&tail=200'
  const req = http.request(
    {
      socketPath: SOCKET,
      path: `/containers/${id}/logs?follow=1&stdout=1&stderr=1&timestamps=1${sinceParam}`,
      method: 'GET',
      headers: { Host: 'localhost' },
    },
    (res) => {
      res.on('data', (chunk: Buffer) => {
        // Docker log format: 8-byte header + payload
        let offset = 0
        while (offset < chunk.length) {
          if (chunk.length - offset < 8) break
          const size = chunk.readUInt32BE(offset + 4)
          if (size === 0) { offset += 8; continue }
          const text = chunk.slice(offset + 8, offset + 8 + size).toString('utf8')
          onData(text)
          offset += 8 + size
        }
      })
      res.on('end', onEnd)
    },
  )
  req.on('error', onEnd)
  req.end()
  return () => req.destroy()
}
