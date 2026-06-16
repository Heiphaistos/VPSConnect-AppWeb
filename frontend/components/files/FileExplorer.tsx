'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import {
  Folder, FolderOpen, File, FileText, ArrowLeft, Home,
  ChevronRight, RefreshCw, Eye, X,
} from 'lucide-react'

interface FileEntry {
  name: string
  isDir: boolean
  isSymlink: boolean
  size: number
  mtime: string
  mode: string
}

interface ListResponse {
  path: string
  parent: string
  entries: FileEntry[]
}

interface ReadResponse {
  path: string
  content: string
  size: number
  mtime: string
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function getFileIcon(entry: FileEntry) {
  if (entry.isDir) return <Folder size={14} className="text-amber-400 flex-shrink-0" />
  const ext = entry.name.split('.').pop()?.toLowerCase() ?? ''
  if (['log', 'txt', 'md', 'sh', 'conf', 'yml', 'yaml', 'json', 'env', 'ts', 'js', 'toml', 'ini'].includes(ext)) {
    return <FileText size={14} className="text-cyan-400 flex-shrink-0" />
  }
  return <File size={14} className="text-text-dim flex-shrink-0" />
}

const TEXT_EXTENSIONS = new Set([
  'log', 'txt', 'md', 'sh', 'conf', 'yml', 'yaml', 'json', 'env',
  'ts', 'js', 'toml', 'ini', 'cfg', 'html', 'css', 'xml', 'sql',
  'py', 'rb', 'go', 'rs', 'php', 'lock',
])

function isReadable(name: string, size: number): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (TEXT_EXTENSIONS.has(ext)) return true
  if (!name.includes('.')) return true // files with no extension (scripts, configs)
  return false
}

export function FileExplorer({ initialPath = '/opt' }: { initialPath?: string }) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [listing, setListing] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<ReadResponse | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [roots, setRoots] = useState<string[]>(['/opt', '/var/log', '/etc/nginx', '/root/.pm2/logs'])

  const loadDir = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    setFileContent(null)
    try {
      const data = await apiFetch<ListResponse>(`/files/list?path=${encodeURIComponent(p)}`)
      setListing(data)
      setCurrentPath(data.path)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFile = useCallback(async (p: string) => {
    setFileLoading(true)
    try {
      const data = await apiFetch<ReadResponse>(`/files/read?path=${encodeURIComponent(p)}`)
      setFileContent(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setFileLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDir(initialPath)
    apiFetch<{ roots: string[] }>('/files/roots').then((r) => setRoots(r.roots)).catch(() => null)
  }, [initialPath, loadDir])

  // Breadcrumb segments
  const segments = currentPath.split('/').filter(Boolean)
  const breadcrumbs = [
    { label: '/', path: '/' },
    ...segments.map((seg, i) => ({
      label: seg,
      path: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ]

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Root shortcuts */}
      <div className="flex flex-wrap gap-2">
        {roots.map((root) => (
          <button
            key={root}
            onClick={() => loadDir(root)}
            className={`font-mono text-xs px-2.5 py-1 rounded border transition-all
              ${currentPath === root || currentPath.startsWith(root + '/')
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-base-800 border-border text-text-dim hover:text-text-secondary hover:border-cyan-500/20'
              }`}
          >
            {root}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => listing?.parent && loadDir(listing.parent)}
          disabled={!listing?.parent || listing.parent === currentPath}
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono transition-all"
        >
          <ArrowLeft size={12} /> Retour
        </button>
        <button
          onClick={() => loadDir('/opt')}
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 text-xs font-mono transition-all"
        >
          <Home size={12} />
        </button>
        <button
          onClick={() => loadDir(currentPath)}
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 text-xs font-mono transition-all"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1 font-mono text-xs text-text-dim overflow-x-auto">
          {breadcrumbs.map((b, i) => (
            <span key={b.path} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <ChevronRight size={10} className="text-text-dim/40" />}
              <button
                onClick={() => loadDir(b.path)}
                className="hover:text-cyan-400 transition-colors"
              >
                {b.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded border border-crimson/30 bg-crimson/5 font-mono text-xs text-crimson flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* File list */}
        <div className="flex-1 min-w-0 card overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-text-dim font-mono text-xs">
              <RefreshCw size={13} className="animate-spin" /> Chargement...
            </div>
          ) : listing ? (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-text-dim font-normal tracking-widest">NOM</th>
                  <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest hidden sm:table-cell">TAILLE</th>
                  <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest hidden md:table-cell">MODIFIÉ</th>
                  <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest hidden lg:table-cell">PERMISSIONS</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {listing.entries.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-text-dim">Dossier vide</td></tr>
                )}
                {listing.entries.map((entry) => (
                  <tr
                    key={entry.name}
                    className="border-b border-border/50 hover:bg-base-700/30 cursor-pointer group transition-colors"
                    onClick={() => {
                      if (entry.isDir) {
                        loadDir(`${currentPath}/${entry.name}`)
                      } else if (isReadable(entry.name, entry.size)) {
                        loadFile(`${currentPath}/${entry.name}`)
                      }
                    }}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {fileContent?.path === `${currentPath}/${entry.name}`
                          ? <FolderOpen size={14} className="text-cyan-400 flex-shrink-0" />
                          : getFileIcon(entry)
                        }
                        <span className={`truncate max-w-[300px] ${entry.isDir ? 'text-amber-400' : 'text-text-primary'}`}>
                          {entry.name}
                          {entry.isDir && '/'}
                          {entry.isSymlink && <span className="text-text-dim ml-1">→</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-text-dim hidden sm:table-cell">
                      {entry.isDir ? '—' : formatSize(entry.size)}
                    </td>
                    <td className="px-3 py-2 text-right text-text-dim hidden md:table-cell">
                      {formatDate(entry.mtime)}
                    </td>
                    <td className="px-3 py-2 text-right text-text-dim/60 hidden lg:table-cell">
                      {entry.mode}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!entry.isDir && isReadable(entry.name, entry.size) && (
                        <Eye size={12} className="text-text-dim/40 group-hover:text-cyan-400 transition-colors" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {/* File content viewer */}
        {(fileContent || fileLoading) && (
          <div className="w-full max-w-[50%] card flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <p className="font-mono text-xs text-text-dim truncate">{fileContent?.path.split('/').pop()}</p>
              <div className="flex items-center gap-2">
                {fileContent && (
                  <span className="font-mono text-[10px] text-text-dim/60">{formatSize(fileContent.size)}</span>
                )}
                <button onClick={() => setFileContent(null)} className="text-text-dim hover:text-text-primary transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
            {fileLoading ? (
              <div className="flex items-center justify-center flex-1 gap-2 text-text-dim font-mono text-xs">
                <RefreshCw size={13} className="animate-spin" /> Lecture...
              </div>
            ) : fileContent ? (
              <pre className="flex-1 overflow-auto p-3 font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                {fileContent.content}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
