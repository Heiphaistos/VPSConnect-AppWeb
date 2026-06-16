'use client'

import { useState } from 'react'
import { StateBadge, PercentBar } from '@/components/ui/Badge'
import { formatBytes } from '@/lib/utils'
import type { Container } from '@/lib/types'
import { ChevronDown, ChevronRight, Terminal, Play, Square, RotateCw } from 'lucide-react'
import { LogViewer } from './LogViewer'
import { apiFetch } from '@/lib/api'

type ActionState = 'idle' | 'loading' | 'done' | 'error'

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
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
      <Icon size={11} />
      <span>{label}</span>
    </button>
  )
}

export function ContainerList({ containers }: { containers: Container[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [logsOpen, setLogsOpen] = useState<string | null>(null)
  const [actions, setActions] = useState<Record<string, ActionState>>({})

  if (!containers.length) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-xs text-text-dim">Aucun conteneur détecté</p>
      </div>
    )
  }

  async function runAction(id: string, action: 'start' | 'stop' | 'restart') {
    setActions((prev) => ({ ...prev, [id + action]: 'loading' }))
    try {
      await apiFetch(`/docker/containers/${id}/${action}`, { method: 'POST' })
      setActions((prev) => ({ ...prev, [id + action]: 'done' }))
    } catch {
      setActions((prev) => ({ ...prev, [id + action]: 'error' }))
    }
    setTimeout(() => setActions((prev) => ({ ...prev, [id + action]: 'idle' })), 3000)
  }

  return (
    <div className="space-y-2">
      {containers.map((c) => (
        <div key={c.id} className="card overflow-hidden">
          {/* Row */}
          <div
            className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-base-700/40 transition-colors duration-150"
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
          >
            {/* Chevron */}
            <div className="text-text-dim">
              {expanded === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {/* Name + image */}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-text-primary truncate">{c.name}</p>
              <p className="font-mono text-xs text-text-dim truncate">{c.image}</p>
            </div>

            {/* State */}
            <div className="w-24 flex-shrink-0">
              <StateBadge state={c.state} />
            </div>

            {/* CPU */}
            <div className="w-24 flex-shrink-0 hidden sm:block">
              <p className="font-mono text-xs text-text-dim mb-1">CPU</p>
              <PercentBar value={c.cpuPercent} />
            </div>

            {/* RAM */}
            <div className="w-28 flex-shrink-0 hidden md:block">
              <p className="font-mono text-xs text-text-dim mb-1">MEM</p>
              <PercentBar value={c.memoryPercent} />
            </div>

            {/* Net */}
            <div className="w-32 flex-shrink-0 hidden lg:block text-right">
              <p className="font-mono text-xs text-mint">↑ {formatBytes(c.networkOut)}</p>
              <p className="font-mono text-xs text-cyan-400">↓ {formatBytes(c.networkIn)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {c.state !== 'deployed' && (
                <ActionButton
                  icon={actions[c.id + 'start'] === 'loading' ? RotateCw : Play}
                  label={actions[c.id + 'start'] === 'loading' ? '...' : 'Start'}
                  onClick={() => runAction(c.id, 'start')}
                />
              )}
              {c.state === 'deployed' && (
                <ActionButton
                  icon={actions[c.id + 'stop'] === 'loading' ? RotateCw : Square}
                  label={actions[c.id + 'stop'] === 'loading' ? '...' : 'Stop'}
                  onClick={() => runAction(c.id, 'stop')}
                  danger
                />
              )}
              <ActionButton
                icon={actions[c.id + 'restart'] === 'loading' ? RotateCw : RotateCw}
                label={actions[c.id + 'restart'] === 'loading' ? '...' : 'Restart'}
                onClick={() => runAction(c.id, 'restart')}
              />
              <button
                onClick={(e) => { e.stopPropagation(); setLogsOpen(logsOpen === c.id ? null : c.id) }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-base-700 border border-border hover:border-cyan-500/40 hover:bg-base-600 transition-all text-text-dim hover:text-cyan-400"
              >
                <Terminal size={12} />
                <span className="font-mono text-xs">Logs</span>
              </button>
            </div>
          </div>

          {/* Expanded details */}
          {expanded === c.id && (
            <div className="border-t border-border px-4 py-3 bg-base-900/50 grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="font-mono text-xs text-text-dim mb-0.5">ID</p>
                <p className="font-mono text-xs text-text-secondary">{c.shortId}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-dim mb-0.5">MÉMOIRE</p>
                <p className="font-mono text-xs text-text-secondary">
                  {formatBytes(c.memoryUsage)} / {formatBytes(c.memoryLimit)}
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-dim mb-0.5">REDÉMARRAGES</p>
                <p className={`font-mono text-xs ${c.restartCount > 5 ? 'text-crimson' : 'text-text-secondary'}`}>
                  {c.restartCount}
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-dim mb-0.5">PORTS</p>
                <p className="font-mono text-xs text-text-secondary">{c.ports.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-dim mb-0.5">DÉMARRÉ</p>
                <p className="font-mono text-xs text-text-secondary">{new Date(c.startedAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          )}

          {/* Log viewer */}
          {logsOpen === c.id && (
            <div className="border-t border-border">
              <LogViewer containerId={c.id} containerName={c.name} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
