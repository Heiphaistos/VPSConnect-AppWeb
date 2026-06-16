import pm2 from 'pm2'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import type { Pm2Process, ProcessState } from '../types.js'

const PM2_HOME = process.env.PM2_HOME ?? '/root/.pm2'

function mapPm2State(status: string): ProcessState {
  if (status === 'online') return 'deployed'
  if (status === 'launching' || status === 'stopping') return 'pending'
  return 'failed'
}

let pm2Connected = false

async function ensureConnected(): Promise<void> {
  if (pm2Connected) return
  return new Promise((resolve, reject) => {
    pm2.connect(false, (err) => {
      if (err) { reject(err); return }
      pm2Connected = true
      resolve()
    })
  })
}

interface Pm2ProcessDescription {
  pid?: number
  name?: string
  pm_id?: number
  pm2_env?: {
    status?: string
    pm_uptime?: number
    restart_time?: number
    instances?: number
    pm_out_log_path?: string
    pm_err_log_path?: string
  }
  monit?: {
    cpu?: number
    memory?: number
  }
}

export async function listProcesses(): Promise<Pm2Process[]> {
  try {
    await ensureConnected()
  } catch {
    return []
  }

  return new Promise((resolve) => {
    pm2.list((err, list) => {
      if (err) { resolve([]); return }

      const processes = (list as Pm2ProcessDescription[]).map((p): Pm2Process => {
        const env = p.pm2_env ?? {}
        const status = env.status ?? 'stopped'
        return {
          pid: p.pid ?? 0,
          name: p.name ?? 'unknown',
          pm_id: p.pm_id ?? 0,
          status,
          state: mapPm2State(status),
          cpu: p.monit?.cpu ?? 0,
          memory: p.monit?.memory ?? 0,
          restarts: env.restart_time ?? 0,
          uptime: env.pm_uptime ? Date.now() - env.pm_uptime : 0,
          instances: env.instances ?? 1,
          logFile: env.pm_out_log_path ?? '',
          errFile: env.pm_err_log_path ?? '',
        }
      })
      resolve(processes)
    })
  })
}

export async function startProcess(name: string): Promise<void> {
  await ensureConnected()
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err) => { if (err) reject(err); else resolve() })
  })
}

export async function stopProcess(name: string): Promise<void> {
  await ensureConnected()
  return new Promise((resolve, reject) => {
    pm2.stop(name, (err) => { if (err) reject(err); else resolve() })
  })
}

export async function restartProcess(name: string): Promise<void> {
  await ensureConnected()
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err) => { if (err) reject(err); else resolve() })
  })
}

export async function streamPm2Logs(
  processName: string,
  onData: (line: string) => void,
  onEnd: () => void,
  tailLines = 150,
): Promise<() => void> {
  const logFile = path.join(PM2_HOME, 'logs', `${processName}-out.log`)
  const errFile = path.join(PM2_HOME, 'logs', `${processName}-error.log`)

  const watchers: fs.FSWatcher[] = []
  let stopped = false

  async function tailFile(filePath: string, label: 'OUT' | 'ERR'): Promise<void> {
    if (!fs.existsSync(filePath)) return

    // Read last N lines
    const lines: string[] = []
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) })
    for await (const line of rl) {
      lines.push(line)
      if (lines.length > tailLines) lines.shift()
    }
    for (const line of lines) {
      if (!stopped) onData(`[${label}] ${line}\n`)
    }

    // Watch for new data
    const watcher = fs.watch(filePath, () => {
      if (stopped) return
      const stream = fs.createReadStream(filePath, { start: fs.statSync(filePath).size })
      const rl2 = readline.createInterface({ input: stream })
      rl2.on('line', (line) => {
        if (!stopped) onData(`[${label}] ${line}\n`)
      })
    })
    watchers.push(watcher)
  }

  await tailFile(logFile, 'OUT')
  await tailFile(errFile, 'ERR')

  return () => {
    stopped = true
    watchers.forEach((w) => w.close())
    onEnd()
  }
}
