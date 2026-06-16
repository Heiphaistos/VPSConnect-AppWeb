'use client'

import { useState } from 'react'
import { StateBadge, PercentBar } from '@/components/ui/Badge'
import { formatBytes, formatDuration } from '@/lib/utils'
import type { Pm2Process } from '@/lib/types'
import { Terminal, RefreshCw, Play, Square, RotateCw } from 'lucide-react'
import { Pm2LogViewer } from './Pm2LogViewer'
import { apiFetch } from '@/lib/api'

type ActionState = 'idle' | 'loading' | 'done' | 'error'

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
  spinning,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
  spinning?: boolean
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={label}
      className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono transition-all
        ${danger
          ? 'border-crimson/40 text-crimson/70 hover:bg-crimson/10 hover:text-crimson hover:border-crimson'
          : 'border-border text-text-dim bg-base-700 hover:border-mint/40 hover:text-mint hover:bg-base-600'
        }`}
    >
      <Icon size={11} className={spinning ? 'animate-spin' : ''} />
      <span>{label}</span>
    </button>
  )
}

export function ProcessList({ processes }: { processes: Pm2Process[] }) {
  const [logsOpen, setLogsOpen] = useState<string | null>(null)
  const [actions, setActions] = useState<Record<string, ActionState>>({})

  if (!processes.length) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-xs text-text-dim">Aucun processus PM2 détecté</p>
      </div>
    )
  }

  async function runAction(name: string, action: 'start' | 'stop' | 'restart') {
    const key = name + action
    setActions((prev) => ({ ...prev, [key]: 'loading' }))
    try {
      await apiFetch(`/pm2/processes/${encodeURIComponent(name)}/${action}`, { method: 'POST' })
      setActions((prev) => ({ ...prev, [key]: 'done' }))
    } catch {
      setActions((prev) => ({ ...prev, [key]: 'error' }))
    }
    setTimeout(() => setActions((prev) => ({ ...prev, [key]: 'idle' })), 3000)
  }

  return (
    <div className="space-y-2">
      {processes.map((p) => (
        <div key={p.pm_id} className="card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3">
            {/* ID */}
            <div className="w-6 flex-shrink-0 text-center">
              <span className="font-mono text-xs text-text-dim">{p.pm_id}</span>
            </div>

            {/* Name + PID */}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-text-primary truncate">{p.name}</p>
              <p className="font-mono text-xs text-text-dim">PID {p.pid} · {p.instances > 1 ? `${p.instances} instances` : '1 instance'}</p>
            </div>

            {/* State */}
            <div className="w-24 flex-shrink-0">
              <StateBadge state={p.state} />
            </div>

            {/* CPU */}
            <div className="w-24 flex-shrink-0 hidden sm:block">
              <p className="font-mono text-xs text-text-dim mb-1">CPU</p>
              <PercentBar value={p.cpu} />
            </div>

            {/* RAM */}
            <div className="w-28 flex-shrink-0 hidden md:block">
              <p className="font-mono text-xs text-text-dim mb-1">RAM</p>
              <p className="font-mono text-xs text-text-secondary">{formatBytes(p.memory)}</p>
            </div>

            {/* Uptime */}
            <div className="w-20 flex-shrink-0 hidden lg:block text-right">
              <p className="font-mono text-xs text-text-dim">UP</p>
              <p className="font-mono text-xs text-text-secondary">{formatDuration(p.uptime)}</p>
            </div>

            {/* Restarts */}
            <div className="w-16 flex-shrink-0 text-right hidden sm:block">
              <p className="font-mono text-xs text-text-dim flex items-center justify-end gap-1">
                <RefreshCw size={9} />
                <span className={p.restarts > 10 ? 'text-crimson' : 'text-text-secondary'}>{p.restarts}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {p.state !== 'deployed' && (
                <ActionButton
                  icon={Play}
                  label={actions[p.name + 'start'] === 'loading' ? '...' : 'Start'}
                  spinning={actions[p.name + 'start'] === 'loading'}
                  onClick={() => runAction(p.name, 'start')}
                />
              )}
              {p.state === 'deployed' && (
                <ActionButton
                  icon={Square}
                  label={actions[p.name + 'stop'] === 'loading' ? '...' : 'Stop'}
                  spinning={actions[p.name + 'stop'] === 'loading'}
                  onClick={() => runAction(p.name, 'stop')}
                  danger
                />
              )}
              <ActionButton
                icon={RotateCw}
                label={actions[p.name + 'restart'] === 'loading' ? '...' : 'Restart'}
                spinning={actions[p.name + 'restart'] === 'loading'}
                onClick={() => runAction(p.name, 'restart')}
              />
              <button
                onClick={() => setLogsOpen(logsOpen === p.name ? null : p.name)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-base-700 border border-border hover:border-cyan-500/40 hover:bg-base-600 transition-all text-text-dim hover:text-cyan-400"
              >
                <Terminal size={12} />
                <span className="font-mono text-xs">Logs</span>
              </button>
            </div>
          </div>

          {/* Log viewer */}
          {logsOpen === p.name && (
            <div className="border-t border-border">
              <Pm2LogViewer processName={p.name} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
