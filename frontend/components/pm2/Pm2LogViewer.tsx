'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createWebSocket } from '@/lib/api'
import { ArrowDown } from 'lucide-react'

interface LogLine { id: number; text: string }
let counter = 0

function colorize(text: string): string {
  if (/\[ERR\]|error|ERROR|fail|FAIL/i.test(text)) return 'log-err'
  if (/\[WARN\]|warn|WARN/i.test(text)) return 'log-warn'
  if (/\[OUT\]|info|INFO|start|listen|ready/i.test(text)) return 'log-info'
  return 'text-text-secondary'
}

export function Pm2LogViewer({ processName }: { processName: string }) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [connected, setConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    const ws = createWebSocket(`/logs/pm2/${processName}`)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; data?: string }
        if (msg.type === 'log' && msg.data) {
          const raw = msg.data.split('\n').filter(Boolean)
          setLines((prev) => {
            const next = [...prev, ...raw.map((text) => ({ id: counter++, text }))]
            return next.length > 1000 ? next.slice(-800) : next
          })
        }
      } catch { /* ignore */ }
    }
  }, [processName])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, autoScroll])

  return (
    <div className="bg-base-950">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-base-900/60">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-mint status-pulse' : 'bg-text-dim'}`} />
        <span className="font-mono text-xs text-text-dim">{processName}</span>
        <span className="font-mono text-xs text-text-dim/50">{lines.length} lignes</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setLines([])}
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

      <div
        ref={containerRef}
        onScroll={() => {
          const el = containerRef.current
          if (el) setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
        }}
        className="log-terminal overflow-y-auto font-mono text-xs leading-relaxed px-4 py-3"
        style={{ height: '260px' }}
      >
        {lines.length === 0 && <p className="text-text-dim">En attente de logs...</p>}
        {lines.map((line) => (
          <div key={line.id} className={`whitespace-pre-wrap break-all ${colorize(line.text)}`}>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
