'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useLogStream } from '@/hooks/useLogStream'
import { ArrowDown, Copy, Search, X } from 'lucide-react'

function colorize(text: string): string {
  if (/error|err\b|fail|critical|fatal/i.test(text)) return 'log-err'
  if (/warn|warning/i.test(text)) return 'log-warn'
  if (/\binfo\b|start|listen|ready|connect/i.test(text)) return 'log-info'
  if (/success|\bok\b|done|started/i.test(text)) return 'log-ok'
  return 'text-text-secondary'
}

// Docker log format: "2026-06-09T22:45:06.123456789Z actual content"
function parseDockerLine(raw: string): { ts: string; content: string } {
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}:\d{2}))[\.\d]*Z\s+([\s\S]*)$/)
  if (m) return { ts: m[2], content: m[3] }
  return { ts: '', content: raw }
}

export function LogViewer({ containerId, containerName }: { containerId: string; containerName: string }) {
  const { lines, connected, reconnecting, clear, copyToClipboard } = useLogStream(`/logs/docker/${containerId}`)
  const [filter, setFilter] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!filter) return lines
    const lower = filter.toLowerCase()
    return lines.filter((l) => l.text.toLowerCase().includes(lower))
  }, [lines, filter])

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filtered, autoScroll])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
  }

  function handleCopy() {
    copyToClipboard(filter)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function toggleSearch() {
    setShowSearch((v) => !v)
    if (showSearch) setFilter('')
  }

  const statusColor = connected
    ? 'bg-mint status-pulse'
    : reconnecting
    ? 'bg-amber-400 status-pulse'
    : 'bg-text-dim'

  return (
    <div className="bg-base-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-base-900/60 flex-wrap gap-y-2">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />
        <span className="font-mono text-xs text-text-dim truncate max-w-[120px]">{containerName}</span>
        <span className="font-mono text-xs text-text-dim/50">
          {filter ? `${filtered.length}/${lines.length}` : lines.length} lignes
        </span>
        {reconnecting && (
          <span className="font-mono text-xs text-amber-400">Reconnexion...</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {showSearch && (
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrer..."
                className="w-36 bg-base-800 border border-border rounded px-2 py-0.5 font-mono text-xs text-text-primary
                           outline-none focus:border-cyan-500/50 pr-5"
              />
              {filter && (
                <button
                  onClick={() => setFilter('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary"
                >
                  <X size={9} />
                </button>
              )}
            </div>
          )}
          <button
            onClick={toggleSearch}
            title="Rechercher"
            className={`p-1 rounded transition-colors ${showSearch ? 'text-cyan-400 bg-cyan-500/10' : 'text-text-dim hover:text-text-secondary hover:bg-base-800'}`}
          >
            <Search size={11} />
          </button>
          <button
            onClick={handleCopy}
            title="Copier les logs"
            className={`flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded transition-colors ${
              copied ? 'text-mint' : 'text-text-dim hover:text-text-secondary hover:bg-base-800'
            }`}
          >
            <Copy size={10} />
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={clear}
            className="font-mono text-xs text-text-dim hover:text-text-secondary px-2 py-0.5 rounded hover:bg-base-800"
          >
            Vider
          </button>
          {!autoScroll && (
            <button
              onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView() }}
              className="flex items-center gap-1 font-mono text-xs text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-cyan-500/10"
            >
              <ArrowDown size={10} /> Bas
            </button>
          )}
        </div>
      </div>

      {/* Log area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="log-terminal overflow-y-auto font-mono text-xs leading-relaxed px-4 py-3"
        style={{ height: '300px' }}
      >
        {filtered.length === 0 && (
          <p className="text-text-dim">{filter ? 'Aucun résultat pour ce filtre' : 'En attente de logs...'}</p>
        )}
        {filtered.map((line) => {
          const { ts, content } = parseDockerLine(line.text)
          const displayText = content || line.text
          return (
            <div key={line.id} className={`whitespace-pre-wrap break-all flex gap-2 ${colorize(displayText)}`}>
              {ts && (
                <span className="text-text-dim/40 flex-shrink-0 select-none tabular-nums">{ts}</span>
              )}
              <span>{displayText}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
