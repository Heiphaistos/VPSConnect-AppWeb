'use client'

import { useState } from 'react'
import {
  Folder, FileText, File, FileCode, FileCog, FileArchive,
  Download, Copy, Terminal, Trash2, Check, FolderSearch, Loader2,
} from 'lucide-react'

export interface FileEntry {
  name: string
  isDir: boolean
  isSymlink: boolean
  size: number
  mtime: string
  mode: string
}

export interface ListResponse {
  path: string
  parent: string | null
  entries: FileEntry[]
}

export function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export const TEXT_EXTS = new Set([
  'log', 'txt', 'md', 'sh', 'bash', 'conf', 'yml', 'yaml', 'json', 'env',
  'ts', 'js', 'tsx', 'jsx', 'toml', 'ini', 'cfg', 'html', 'css', 'xml',
  'sql', 'py', 'rb', 'go', 'rs', 'php', 'lock', 'gitignore', 'dockerfile',
  'nginx', 'config',
])

export function isReadable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return TEXT_EXTS.has(ext) || !name.includes('.') || name.startsWith('.')
}

function FileIcon({ entry }: { entry: FileEntry }) {
  if (entry.isDir) return <Folder size={14} className="text-amber-400 flex-shrink-0" />
  const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
  if (['ts', 'js', 'tsx', 'jsx', 'py', 'go', 'rs', 'rb', 'php', 'sh', 'bash'].includes(ext))
    return <FileCode size={14} className="text-cyan-400 flex-shrink-0" />
  if (['log', 'txt', 'md'].includes(ext))
    return <FileText size={14} className="text-text-secondary flex-shrink-0" />
  if (['yml', 'yaml', 'json', 'toml', 'ini', 'conf', 'cfg', 'env'].includes(ext))
    return <FileCog size={14} className="text-mint flex-shrink-0" />
  if (['gz', 'tar', 'zip', '7z', 'bz2', 'xz'].includes(ext))
    return <FileArchive size={14} className="text-amber-400/70 flex-shrink-0" />
  return <File size={14} className="text-text-dim flex-shrink-0" />
}

interface FileListProps {
  listing: ListResponse
  currentPath: string
  viewingPath: string | null
  search: string
  renaming: string | null
  dirSizes: Record<string, number>
  computingDu: string | null
  onNavigate: (p: string) => void
  onLoadFile: (p: string) => void
  onSetDelete: (p: string) => void
  onRenameSubmit: (entry: FileEntry, newName: string) => void
  onRenameCancel: () => void
  onRenameStart: (fullPath: string) => void
  onCopyPath: (p: string) => void
  onCdTerminal: (p: string) => void
  onComputeSize: (p: string) => void
  onDownload: (p: string, name: string) => void
}

export function FileList({
  listing, currentPath, viewingPath, search,
  renaming, dirSizes, computingDu,
  onNavigate, onLoadFile, onSetDelete, onRenameStart,
  onRenameSubmit, onRenameCancel, onCopyPath,
  onCdTerminal, onComputeSize, onDownload,
}: FileListProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')

  const filtered = search
    ? listing.entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : listing.entries

  function handleCopy(p: string) {
    onCopyPath(p)
    setCopiedPath(p)
    setTimeout(() => setCopiedPath(null), 1500)
  }

  function startRename(entry: FileEntry, fullPath: string) {
    setRenameInput(entry.name)
    onRenameStart(fullPath)
  }

  return (
    <table className="w-full text-xs font-mono min-w-[320px]">
      <thead className="sticky top-0 bg-base-900 z-10">
        <tr className="border-b border-border">
          <th className="text-left px-3 py-2 text-text-dim font-normal tracking-widest text-[10px]">NOM</th>
          <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest text-[10px] hidden sm:table-cell">TAILLE</th>
          <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest text-[10px] hidden md:table-cell">MODIFIÉ</th>
          <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest text-[10px] hidden lg:table-cell">PERM</th>
          <th className="w-24" />
        </tr>
      </thead>
      <tbody>
        {filtered.length === 0 && (
          <tr>
            <td colSpan={5} className="text-center py-10 text-text-dim">
              {search ? 'Aucun résultat pour cette recherche' : 'Dossier vide'}
            </td>
          </tr>
        )}
        {filtered.map((entry) => {
          const fullPath = `${currentPath}/${entry.name}`
          const isViewing = viewingPath === fullPath
          const isRenamingThis = renaming === fullPath

          return (
            <tr
              key={entry.name}
              className={`border-b border-border/40 cursor-pointer group transition-colors
                ${isViewing ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500/40' : 'hover:bg-base-700/30'}`}
              onClick={() => {
                if (isRenamingThis) return
                if (entry.isDir) onNavigate(fullPath)
                else if (isReadable(entry.name)) onLoadFile(fullPath)
              }}
            >
              {/* Nom */}
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileIcon entry={entry} />
                  {isRenamingThis ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); onRenameSubmit(entry, renameInput) }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1"
                    >
                      <input
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onBlur={onRenameCancel}
                        onKeyDown={(e) => { if (e.key === 'Escape') onRenameCancel() }}
                        className="w-full font-mono text-xs bg-base-700 border border-cyan-500/40 rounded px-2 py-0.5 text-text-primary focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </form>
                  ) : (
                    <span
                      className={`truncate max-w-[180px] select-none
                        ${entry.isDir ? 'text-amber-400' : isViewing ? 'text-cyan-400' : 'text-text-primary'}`}
                      onDoubleClick={(e) => { e.stopPropagation(); startRename(entry, fullPath) }}
                      title="Double-clic pour renommer"
                    >
                      {entry.name}{entry.isDir ? '/' : ''}{entry.isSymlink ? ' →' : ''}
                    </span>
                  )}
                </div>
              </td>

              {/* Taille */}
              <td className="px-3 py-2 text-right text-text-dim hidden sm:table-cell">
                {entry.isDir ? (
                  dirSizes[fullPath] !== undefined ? (
                    <span className="text-text-dim/70">{fmtSize(dirSizes[fullPath])}</span>
                  ) : computingDu === fullPath ? (
                    <Loader2 size={10} className="animate-spin ml-auto" />
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onComputeSize(fullPath) }}
                      title="Calculer la taille du dossier"
                      className="text-text-dim/30 hover:text-cyan-400 transition-colors"
                    >
                      <FolderSearch size={10} />
                    </button>
                  )
                ) : (
                  fmtSize(entry.size)
                )}
              </td>

              {/* Date */}
              <td className="px-3 py-2 text-right text-text-dim hidden md:table-cell">
                {fmtDate(entry.mtime)}
              </td>

              {/* Perms */}
              <td className="px-3 py-2 text-right text-text-dim/50 hidden lg:table-cell">
                {entry.mode}
              </td>

              {/* Actions */}
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(fullPath) }}
                    title="Copier le chemin"
                    className="text-text-dim hover:text-cyan-400 transition-colors p-0.5"
                  >
                    {copiedPath === fullPath
                      ? <Check size={10} className="text-mint" />
                      : <Copy size={10} />}
                  </button>
                  {entry.isDir ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCdTerminal(fullPath) }}
                      title="Ouvrir dans le terminal (cd)"
                      className="text-text-dim hover:text-cyan-400 transition-colors p-0.5"
                    >
                      <Terminal size={10} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDownload(fullPath, entry.name) }}
                      title="Télécharger"
                      className="text-text-dim hover:text-mint transition-colors p-0.5"
                    >
                      <Download size={10} />
                    </button>
                  )}
                  {!entry.isDir && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetDelete(fullPath) }}
                      title="Supprimer"
                      className="text-text-dim hover:text-crimson transition-colors p-0.5"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
