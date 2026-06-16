'use client'

import { Header } from '@/components/layout/Header'
import { FileExplorer } from '@/components/files/FileExplorer'
import { FolderOpen } from 'lucide-react'

export default function FilesPage() {
  return (
    <div className="flex-1 page-enter flex flex-col" style={{ minHeight: 0 }}>
      <Header title="Fichiers" subtitle="EXPLORATEUR VPS" />

      <main className="p-6 flex-1 flex flex-col min-h-0 max-w-[1400px]">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={14} className="text-text-dim" />
          <span className="font-mono text-xs text-text-dim tracking-widest">SYSTÈME DE FICHIERS</span>
        </div>
        <div className="flex-1 min-h-0">
          <FileExplorer initialPath="/opt" />
        </div>
      </main>
    </div>
  )
}
