'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useLogStream } from '@/hooks/useLogStream'
import { ArrowDown, Copy, Search, X } from 'lucide-react'

function colorize(text: string): string {
  if (/\[ERR\]|error\b|ERROR|fail\b|FAIL/i.test(text)) return 'log-err'
  if (/\[WARN\]|\bwarn\b|WARN/i.test(text)) return 'log-warn'
  if (/\[OUT\]|\binfo\b|INFO|start|listen|ready/i.test(text)) return 'log-info'
  return 'text-text-secondary'
}

export function Pm2LogViewer({ processName }: { processName: string }) {
  const { lines, connected, reconnecting, clear, copyToClipboard } = useLogStream(`/logs/pm2/${processName}`)
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
        <span className="font-mono text-xs text-text-dim">{processName}</span>
        <span className="font-mono text-xs text-text-dim/50">
          {filter ? `${filtered.length}/${lines.length}` : lines.length} lignes
        </span>
        {reconnecting && <span className="font-mono text-xs text-amber-400">Reconnexion...</span>}

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
              className="flex items-center gap-1 font-mono text-xs text-cyan-400 px-2 py-0.5 rounded hover:bg-cyan-500/10"
            >
              <ArrowDown size={10} /> Bas
            </button>
          )}
        </div>
      </div>

      {/* Log area */}
      <div
        ref={containerRef}
        onScroll={() => {
          const el = containerRef.current
          if (el) setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
        }}
        className="log-terminal overflow-y-auto font-mono text-xs leading-relaxed px-4 py-3"
        style={{ height: '280px' }}
      >
        {filtered.length === 0 && (
          <p className="text-text-dim">{filter ? 'Aucun résultat' : 'En attente de logs...'}</p>
        )}
        {filtered.map((line) => (
          <div key={line.id} className={`whitespace-pre-wrap break-all ${colorize(line.text)}`}>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
