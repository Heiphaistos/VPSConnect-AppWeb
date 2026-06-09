'use client'

import { Header } from '@/components/layout/Header'
import { ContainerList } from '@/components/docker/ContainerList'
import { useSnapshot } from '@/hooks/useMetrics'
import { Container, RefreshCw } from 'lucide-react'

export default function DockerPage() {
  const { snapshot, loading } = useSnapshot(5_000)

  const containers = snapshot?.containers ?? []
  const running = containers.filter((c) => c.state === 'deployed').length
  const failed = containers.filter((c) => c.state === 'failed').length

  return (
    <div className="flex-1 page-enter">
      <Header title="Docker" subtitle="CONTENEURS ET LOGS EN TEMPS RÉEL" />

      <main className="p-6 space-y-5 max-w-[1400px]">
        {/* Summary bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Container size={14} className="text-text-dim" />
            <span className="font-mono text-xs text-text-dim">{containers.length} CONTENEURS</span>
          </div>
          <span className="font-mono text-xs text-mint">{running} ACTIFS</span>
          {failed > 0 && <span className="font-mono text-xs text-crimson">{failed} EN ERREUR</span>}
          {loading && (
            <div className="ml-auto flex items-center gap-1.5 text-text-dim">
              <RefreshCw size={11} className="animate-spin" />
              <span className="font-mono text-xs">Rafraîchissement...</span>
            </div>
          )}
        </div>

        {/* Container list */}
        <ContainerList containers={containers} />
      </main>
    </div>
  )
}
