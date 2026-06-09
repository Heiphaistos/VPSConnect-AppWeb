'use client'

import { useEffect, useState } from 'react'
import { useSnapshot } from '@/hooks/useMetrics'
import { formatUptime } from '@/lib/utils'

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      setTime(d.toISOString().slice(11, 19))
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-xs text-text-dim tabular-nums">{time} UTC</span>
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { snapshot } = useSnapshot()

  return (
    <header className="h-14 border-b border-border bg-base-900/80 backdrop-blur-sm flex items-center px-6 gap-6 sticky top-0 z-30">
      {/* Page title */}
      <div className="flex-1">
        <h1 className="font-display font-bold text-text-primary text-sm">{title}</h1>
        {subtitle && <p className="font-mono text-[10px] text-text-dim tracking-widest">{subtitle}</p>}
      </div>

      {/* Live stats pill */}
      {snapshot && (
        <div className="hidden md:flex items-center gap-4 bg-base-800 border border-border rounded-lg px-4 py-1.5 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-text-dim">CPU</span>
            <span className={snapshot.system.cpu.usage > 80 ? 'text-crimson' : 'text-cyan-400'}>
              {snapshot.system.cpu.usage.toFixed(0)}%
            </span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-text-dim">RAM</span>
            <span className={snapshot.system.memory.percent > 85 ? 'text-crimson' : 'text-mint'}>
              {snapshot.system.memory.percent.toFixed(0)}%
            </span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-text-dim">UP</span>
            <span className="text-text-secondary">{formatUptime(snapshot.system.uptime)}</span>
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-mint status-pulse" />
        <LiveClock />
      </div>
    </header>
  )
}
