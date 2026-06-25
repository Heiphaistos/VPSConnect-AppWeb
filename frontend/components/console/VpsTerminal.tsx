'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { apiFetch } from '@/lib/api'

export function VpsTerminal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [hostname, setHostname] = useState<string>('vps')
  const sessionRef = useRef<{ term: Terminal; ws: WebSocket; fit: FitAddon; ro: ResizeObserver } | null>(null)

  // Chemin à ouvrir automatiquement (passé via ?cd= depuis l'explorateur)
  const initialCd = useRef<string | null>(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('cd')
      : null,
  )

  useEffect(() => {
    apiFetch<{ system?: { hostname?: string } }>('/metrics/snapshot')
      .then((d) => { if (d.system?.hostname) setHostname(d.system.hostname) })
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      scrollback: 10000,
      theme: {
        background: '#080a0f',
        foreground: '#c9d1d9',
        cursor: '#00e898',
        cursorAccent: '#080a0f',
        selectionBackground: '#1e3a5f',
        black: '#0d1117',        red: '#f85149',       green: '#3fb950',    yellow: '#d29922',
        blue: '#388bfd',         magenta: '#bc8cff',   cyan: '#39c5cf',     white: '#b1bac4',
        brightBlack: '#6e7681',  brightRed: '#ff7b72', brightGreen: '#56d364', brightYellow: '#e3b341',
        brightBlue: '#79c0ff',   brightMagenta: '#d2a8ff', brightCyan: '#56d4dd', brightWhite: '#f0f6fc',
      },
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws/console`)

    ws.onopen = () => {
      setStatus('connected')
      const dims = fit.proposeDimensions()
      if (dims) ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      // cd automatique si param ?cd= passé depuis l'explorateur
      if (initialCd.current) {
        const cdPath = initialCd.current
        initialCd.current = null
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'input', data: `cd '${cdPath.replace(/'/g, "'\\''")}'\r` }))
        }, 300)
      }
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { type: string; data?: string; code?: number; message?: string }
        if (msg.type === 'data' && msg.data) term.write(msg.data)
        if (msg.type === 'exit') {
          term.writeln(`\r\n\x1b[33m[Session terminée — code: ${msg.code}]\x1b[0m`)
          setStatus('disconnected')
        }
        if (msg.type === 'error') {
          term.writeln(`\r\n\x1b[31m[Erreur: ${msg.message ?? 'inconnue'}]\x1b[0m`)
          setStatus('disconnected')
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      term.writeln('\r\n\x1b[33m[Connexion fermée — rechargez pour reconnecter]\x1b[0m')
    }

    ws.onerror = () => {
      setStatus('disconnected')
    }

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const ro = new ResizeObserver(() => {
      fit.fit()
      const dims = fit.proposeDimensions()
      if (dims && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      }
    })
    ro.observe(containerRef.current)

    sessionRef.current = { term, ws, fit, ro }

    return () => {
      ro.disconnect()
      ws.close()
      term.dispose()
      sessionRef.current = null
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-base-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            status === 'connected' ? 'bg-mint animate-pulse' :
            status === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-crimson'
          }`} />
          <span className="font-mono text-xs text-text-dim">
            {status === 'connected' ? `root@${hostname} — bash` :
             status === 'connecting' ? 'Connexion en cours...' : 'Déconnecté'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-dim/40">
          /root · pm2 · docker disponibles
        </span>
      </div>

      {/* xterm container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        style={{ background: '#080a0f', padding: '4px' }}
      />
    </div>
  )
}
