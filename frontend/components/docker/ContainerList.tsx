'use client'

import { useState } from 'react'
import { StateBadge, PercentBar } from '@/components/ui/Badge'
import { formatBytes } from '@/lib/utils'
import type { Container } from '@/lib/types'
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react'
import { LogViewer } from './LogViewer'

export function ContainerList({ containers }: { containers: Container[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [logsOpen, setLogsOpen] = useState<string | null>(null)

  if (!containers.length) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-xs text-text-dim">Aucun conteneur détecté</p>
      </div>
    )
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

            {/* Logs button */}
            <button
              onClick={(e) => { e.stopPropagation(); setLogsOpen(logsOpen === c.id ? null : c.id) }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-base-700 border border-border hover:border-cyan-500/40 hover:bg-base-600 transition-all text-text-dim hover:text-cyan-400"
            >
              <Terminal size={12} />
              <span className="font-mono text-xs">Logs</span>
            </button>
          </div>

          {/* Expanded details */}
          {expanded === c.id && (
            <div className="border-t border-border px-4 py-3 bg-base-900/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
