'use client'

import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { TerminalSquare } from 'lucide-react'

// SSR=false: xterm requires window/document
const VpsTerminal = dynamic(
  () => import('@/components/console/VpsTerminal').then((m) => m.VpsTerminal),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center flex-1 gap-2 text-text-dim font-mono text-xs">
      <span className="animate-pulse">Chargement du terminal...</span>
    </div>
  )}
)

export default function ConsolePage() {
  return (
    <div className="flex-1 page-enter flex flex-col" style={{ minHeight: 0 }}>
      <Header title="Console" subtitle="TERMINAL VPS" />

      <main className="flex-1 flex flex-col min-h-0 p-6 max-w-[1400px]">
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <TerminalSquare size={14} className="text-text-dim" />
          <span className="font-mono text-xs text-text-dim tracking-widest">SHELL INTERACTIF</span>
        </div>

        <div className="card flex-1 flex flex-col overflow-hidden min-h-0">
          <VpsTerminal />
        </div>

        <p className="font-mono text-[10px] text-text-dim/40 mt-2 flex-shrink-0">
          Shell bash · Accès aux volumes montés : /opt /var/log /etc /home /root · pm2 disponible
        </p>
      </main>
    </div>
  )
}
