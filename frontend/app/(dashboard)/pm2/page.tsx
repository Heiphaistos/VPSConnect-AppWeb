'use client'

import { Header } from '@/components/layout/Header'
import { ProcessList } from '@/components/pm2/ProcessList'
import { useSnapshot } from '@/hooks/useMetrics'
import { Cpu, RefreshCw } from 'lucide-react'

export default function Pm2Page() {
  const { snapshot, loading } = useSnapshot(5_000)

  const processes = snapshot?.processes ?? []
  const online = processes.filter((p) => p.state === 'deployed').length
  const errored = processes.filter((p) => p.state === 'failed').length

  return (
    <div className="flex-1 page-enter">
      <Header title="PM2" subtitle="PROCESSUS NODE.JS ET LOGS EN TEMPS RÉEL" />

      <main className="p-6 space-y-5 max-w-[1400px]">
        {/* Summary bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-text-dim" />
            <span className="font-mono text-xs text-text-dim">{processes.length} PROCESSUS</span>
          </div>
          <span className="font-mono text-xs text-mint">{online} EN LIGNE</span>
          {errored > 0 && <span className="font-mono text-xs text-crimson">{errored} EN ERREUR</span>}
          {loading && (
            <div className="ml-auto flex items-center gap-1.5 text-text-dim">
              <RefreshCw size={11} className="animate-spin" />
              <span className="font-mono text-xs">Rafraîchissement...</span>
            </div>
          )}
        </div>

        {/* Process list */}
        <ProcessList processes={processes} />
      </main>
    </div>
  )
}
