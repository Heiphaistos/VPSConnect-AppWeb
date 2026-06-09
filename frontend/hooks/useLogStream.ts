'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createWebSocket } from '@/lib/api'

export interface LogLine {
  id: number
  text: string
}

let globalCounter = 0
const MAX_LINES = 1000
const TRIM_TO = 800
// Backoff delays in ms: 1s, 2s, 4s, 8s, 16s, 30s (max)
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]

export function useLogStream(path: string) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (unmountedRef.current) return
    wsRef.current?.close()

    const ws = createWebSocket(path)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) return
      setConnected(true)
      setReconnecting(false)
      attemptRef.current = 0
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      setConnected(false)
      setReconnecting(true)
      const delay = BACKOFF_MS[Math.min(attemptRef.current, BACKOFF_MS.length - 1)]
      attemptRef.current++
      timerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect()
      }, delay)
    }

    ws.onmessage = (ev) => {
      if (unmountedRef.current) return
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; data?: string }
        if (msg.type === 'log' && msg.data) {
          const raw = msg.data.split('\n').filter(Boolean)
          setLines((prev) => {
            const next = [...prev, ...raw.map((text) => ({ id: globalCounter++, text }))]
            return next.length > MAX_LINES ? next.slice(-TRIM_TO) : next
          })
        }
      } catch { /* ignore */ }
    }
  }, [path])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const clear = useCallback(() => setLines([]), [])

  const copyToClipboard = useCallback((filter = '') => {
    const lower = filter.toLowerCase()
    const text = lines
      .filter((l) => !filter || l.text.toLowerCase().includes(lower))
      .map((l) => l.text)
      .join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }, [lines])

  return { lines, connected, reconnecting, clear, copyToClipboard }
}
