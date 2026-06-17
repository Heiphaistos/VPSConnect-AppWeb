'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import {
  Folder, FileText, File, FileCode, FileCog, FileArchive,
  ArrowLeft, Home, RefreshCw, ChevronRight, Eye,
  X, Edit3, Trash2, Save, AlertTriangle,
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
  parent: string | null
  entries: FileEntry[]
}

interface ReadResponse {
  path: string
  content: string
  size: number
  mtime: string
}

function fmtSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
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

const TEXT_EXTS = new Set([
  'log', 'txt', 'md', 'sh', 'bash', 'conf', 'yml', 'yaml', 'json', 'env',
  'ts', 'js', 'tsx', 'jsx', 'toml', 'ini', 'cfg', 'html', 'css', 'xml',
  'sql', 'py', 'rb', 'go', 'rs', 'php', 'lock', 'gitignore', 'dockerfile',
  'nginx', 'cfg', 'config',
])

function isReadable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return TEXT_EXTS.has(ext) || !name.includes('.') || name.startsWith('.')
}

// ─── Breadcrumb ────────────────────────────────────────────────────────────
function Breadcrumb({ currentPath, onNavigate }: { currentPath: string; onNavigate: (p: string) => void }) {
  const segs = currentPath.split('/').filter(Boolean)
  return (
    <div className="flex items-center gap-0.5 font-mono text-xs text-text-dim overflow-x-auto min-w-0 flex-1">
      <span className="text-text-dim/40">/</span>
      {segs.map((seg, i) => {
        const p = '/' + segs.slice(0, i + 1).join('/')
        const isLast = i === segs.length - 1
        return (
          <span key={p} className="flex items-center gap-0.5 flex-shrink-0">
            <ChevronRight size={10} className="text-text-dim/30" />
            <button
              onClick={() => !isLast && onNavigate(p)}
              className={isLast
                ? 'text-text-primary cursor-default'
                : 'hover:text-cyan-400 transition-colors cursor-pointer'
              }
            >
              {seg}
            </button>
          </span>
        )
      })}
    </div>
  )
}

// ─── Delete confirmation ────────────────────────────────────────────────────
function ConfirmDelete({ path, onConfirm, onCancel }: { path: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card p-5 max-w-sm w-full mx-4 border-crimson/30">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-crimson" />
          <p className="font-mono text-sm text-text-primary">Supprimer le fichier ?</p>
        </div>
        <p className="font-mono text-xs text-text-dim mb-4 break-all">{path}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 rounded border border-border text-xs font-mono text-text-dim hover:text-text-primary transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 rounded border border-crimson/50 bg-crimson/10 text-xs font-mono text-crimson hover:bg-crimson/20 transition-colors">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export function FileExplorer({ initialPath = '/opt' }: { initialPath?: string }) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [listing, setListing] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viewer, setViewer] = useState<ReadResponse | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [roots, setRoots] = useState<string[]>([])

  const [pathInput, setPathInput] = useState('')
  const [pathInputActive, setPathInputActive] = useState(false)
  const pathInputRef = useRef<HTMLInputElement>(null)

  const loadDir = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    setViewer(null)
    setEditMode(false)
    try {
      const data = await apiFetch<ListResponse>(`/files/list?path=${encodeURIComponent(p)}`)
      setListing(data)
      setCurrentPath(data.path)
      setPathInput(data.path)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFile = useCallback(async (p: string) => {
    setViewerLoading(true)
    setEditMode(false)
    setViewer(null)
    try {
      const data = await apiFetch<ReadResponse>(`/files/read?path=${encodeURIComponent(p)}`)
      setViewer(data)
      setEditContent(data.content)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setViewerLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDir(initialPath)
    apiFetch<{ roots: string[] }>('/files/roots')
      .then((r) => setRoots(r.roots))
      .catch(() => null)
  }, [initialPath, loadDir])

  async function saveFile() {
    if (!viewer) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await apiFetch('/files/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: viewer.path, content: editContent }),
      })
      setSaveMsg('Sauvegardé ✓')
      setViewer({ ...viewer, content: editContent })
      setEditMode(false)
    } catch (e) {
      setSaveMsg(`Erreur: ${(e as Error).message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  async function deleteFile(filePath: string) {
    try {
      await apiFetch(`/files?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' })
      setDeleteTarget(null)
      setViewer(null)
      loadDir(currentPath)
    } catch (e) {
      setError((e as Error).message)
      setDeleteTarget(null)
    }
  }

  function handlePathInputSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPathInputActive(false)
    loadDir(pathInput)
  }

  const dirs = listing?.entries.filter((e) => e.isDir).length ?? 0
  const files = listing?.entries.filter((e) => !e.isDir).length ?? 0

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Root shortcuts */}
      {roots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 flex-shrink-0">
          {roots.map((root) => (
            <button
              key={root}
              onClick={() => loadDir(root)}
              className={`font-mono text-[11px] px-2.5 py-1 rounded border transition-all
                ${currentPath === root || currentPath.startsWith(root + '/')
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-base-800 border-border text-text-dim hover:text-text-secondary hover:border-cyan-500/20'
                }`}
            >
              {root}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => listing?.parent && loadDir(listing.parent)}
          disabled={!listing?.parent}
          title="Dossier parent"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 disabled:opacity-25 disabled:cursor-not-allowed text-xs font-mono transition-all flex-shrink-0"
        >
          <ArrowLeft size={12} />
        </button>
        <button
          onClick={() => loadDir('/opt')}
          title="Accueil /opt"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 text-xs font-mono transition-all flex-shrink-0"
        >
          <Home size={12} />
        </button>
        <button
          onClick={() => loadDir(currentPath)}
          title="Rafraîchir"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 text-xs font-mono transition-all flex-shrink-0"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* Path bar — click to edit */}
        {pathInputActive ? (
          <form onSubmit={handlePathInputSubmit} className="flex-1">
            <input
              ref={pathInputRef}
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onBlur={() => { setPathInputActive(false); setPathInput(currentPath) }}
              className="w-full font-mono text-xs bg-base-700 border border-cyan-500/40 rounded px-2 py-1.5 text-text-primary focus:outline-none"
              autoFocus
            />
          </form>
        ) : (
          <button
            onClick={() => { setPathInputActive(true); setPathInput(currentPath); setTimeout(() => pathInputRef.current?.select(), 0) }}
            className="flex-1 min-w-0 flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 hover:border-cyan-500/20 transition-all"
          >
            <Breadcrumb currentPath={currentPath} onNavigate={loadDir} />
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-3 py-2 rounded border border-crimson/30 bg-crimson/5 font-mono text-xs text-crimson flex-shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Content area */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
        {/* File listing */}
        <div className="flex flex-col min-w-0 overflow-hidden" style={{ flex: viewer || viewerLoading ? '0 0 45%' : '1 1 100%' }}>
          <div className="card flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-text-dim font-mono text-xs">
                <RefreshCw size={13} className="animate-spin" /> Chargement...
              </div>
            ) : listing ? (
              <>
                <table className="w-full text-xs font-mono min-w-[320px]">
                  <thead className="sticky top-0 bg-base-900 z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-text-dim font-normal tracking-widest text-[10px]">NOM</th>
                      <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest text-[10px] hidden sm:table-cell">TAILLE</th>
                      <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest text-[10px] hidden md:table-cell">MODIFIÉ</th>
                      <th className="text-right px-3 py-2 text-text-dim font-normal tracking-widest text-[10px] hidden lg:table-cell">PERM</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {listing.entries.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-text-dim">Dossier vide</td></tr>
                    )}
                    {listing.entries.map((entry) => {
                      const fullPath = `${currentPath}/${entry.name}`
                      const isViewing = viewer?.path === fullPath
                      return (
                        <tr
                          key={entry.name}
                          className={`border-b border-border/40 cursor-pointer group transition-colors
                            ${isViewing ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500/40' : 'hover:bg-base-700/30'}`}
                          onClick={() => {
                            if (entry.isDir) loadDir(fullPath)
                            else if (isReadable(entry.name)) loadFile(fullPath)
                          }}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <FileIcon entry={entry} />
                              <span className={`truncate max-w-[180px] ${entry.isDir ? 'text-amber-400' : isViewing ? 'text-cyan-400' : 'text-text-primary'}`}>
                                {entry.name}{entry.isDir ? '/' : ''}{entry.isSymlink ? ' →' : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-text-dim hidden sm:table-cell">
                            {entry.isDir ? '—' : fmtSize(entry.size)}
                          </td>
                          <td className="px-3 py-2 text-right text-text-dim hidden md:table-cell">
                            {fmtDate(entry.mtime)}
                          </td>
                          <td className="px-3 py-2 text-right text-text-dim/50 hidden lg:table-cell">{entry.mode}</td>
                          <td className="px-3 py-2 text-right">
                            {!entry.isDir && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(fullPath) }}
                                title="Supprimer"
                                className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-crimson transition-all"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Status bar */}
                <div className="px-3 py-1.5 border-t border-border/40 flex gap-4">
                  <span className="font-mono text-[10px] text-text-dim/60">{dirs} dossier{dirs > 1 ? 's' : ''}</span>
                  <span className="font-mono text-[10px] text-text-dim/60">{files} fichier{files > 1 ? 's' : ''}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Viewer / Editor panel */}
        {(viewer || viewerLoading) && (
          <div className="flex flex-col flex-1 min-w-0 min-h-0 card overflow-hidden">
            {/* Viewer header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0 gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-text-primary truncate">{viewer?.path.split('/').pop()}</p>
                {viewer && <p className="font-mono text-[10px] text-text-dim/60">{fmtSize(viewer.size)} · {fmtDate(viewer.mtime)}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {saveMsg && (
                  <span className={`font-mono text-[10px] ${saveMsg.startsWith('Err') ? 'text-crimson' : 'text-mint'}`}>{saveMsg}</span>
                )}
                {viewer && !editMode && (
                  <button
                    onClick={() => { setEditMode(true); setEditContent(viewer.content) }}
                    title="Éditer"
                    className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-base-700 text-text-dim hover:text-mint hover:border-mint/40 transition-all text-[11px] font-mono"
                  >
                    <Edit3 size={11} /> Éditer
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={() => { setEditMode(false); setEditContent(viewer?.content ?? '') }}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-border text-text-dim text-[11px] font-mono hover:text-text-primary transition-colors"
                    >
                      <X size={11} /> Annuler
                    </button>
                    <button
                      onClick={saveFile}
                      disabled={saving}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-mint/40 bg-mint/10 text-mint text-[11px] font-mono hover:bg-mint/20 disabled:opacity-50 transition-all"
                    >
                      {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                      Sauver
                    </button>
                  </>
                )}
                {viewer && !editMode && (
                  <button
                    onClick={() => setDeleteTarget(viewer.path)}
                    title="Supprimer ce fichier"
                    className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-base-700 text-text-dim hover:text-crimson hover:border-crimson/40 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
                <button onClick={() => { setViewer(null); setEditMode(false) }} className="text-text-dim hover:text-text-primary transition-colors p-1">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Content */}
            {viewerLoading ? (
              <div className="flex items-center justify-center flex-1 gap-2 text-text-dim font-mono text-xs">
                <RefreshCw size={13} className="animate-spin" /> Lecture...
              </div>
            ) : editMode ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 resize-none p-3 font-mono text-[12px] text-text-primary bg-base-900 focus:outline-none leading-relaxed"
                spellCheck={false}
              />
            ) : viewer ? (
              <pre className="flex-1 overflow-auto p-3 font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                {viewer.content}
              </pre>
            ) : null}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDelete
          path={deleteTarget}
          onConfirm={() => deleteFile(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
