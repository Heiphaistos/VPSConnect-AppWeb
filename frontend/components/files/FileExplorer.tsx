'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft, ArrowRight, Home, RefreshCw, ChevronRight, X,
  AlertTriangle, Search, Star, StarOff, Plus, FolderPlus, FilePlus,
  Upload, Loader2,
} from 'lucide-react'
import { apiFetch, apiDownload, apiUpload } from '@/lib/api'
import { FileList, type FileEntry, type ListResponse, fmtSize } from './FileList'
import { FileViewer, type ReadResponse } from './FileViewer'

// ─── Breadcrumb ──────────────────────────────────────────────────────────────
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
                : 'hover:text-cyan-400 transition-colors cursor-pointer'}
            >
              {seg}
            </button>
          </span>
        )
      })}
    </div>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────
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

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateModal({ type, onConfirm, onCancel }: {
  type: 'file' | 'dir'
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card p-5 max-w-sm w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          {type === 'dir' ? <FolderPlus size={15} className="text-amber-400" /> : <FilePlus size={15} className="text-cyan-400" />}
          <p className="font-mono text-sm text-text-primary">
            {type === 'dir' ? 'Nouveau dossier' : 'Nouveau fichier'}
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onConfirm(name.trim()) }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'dir' ? 'nom-du-dossier' : 'fichier.txt'}
            className="w-full font-mono text-xs bg-base-700 border border-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-cyan-500/40 mb-4"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded border border-border text-xs font-mono text-text-dim hover:text-text-primary transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-xs font-mono text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FAVORITES_KEY = 'vpsconnect_favorites'

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]') } catch { return [] }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FileExplorer({ initialPath = '/opt' }: { initialPath?: string }) {
  // Navigation state
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [listing, setListing] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roots, setRoots] = useState<string[]>([])
  const [pathInput, setPathInput] = useState('')
  const [pathInputActive, setPathInputActive] = useState(false)
  const pathInputRef = useRef<HTMLInputElement>(null)

  // History
  const historyRef = useRef<string[]>([initialPath])
  const histIdxRef = useRef(0)
  const [canBack, setCanBack] = useState(false)
  const [canForward, setCanForward] = useState(false)

  // Viewer/editor
  const [viewer, setViewer] = useState<ReadResponse | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Modals & actions
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [createModal, setCreateModal] = useState<'file' | 'dir' | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  // Search
  const [search, setSearch] = useState('')

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([])
  const [showFavorites, setShowFavorites] = useState(false)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Directory sizes cache
  const [dirSizes, setDirSizes] = useState<Record<string, number>>({})
  const [computingDu, setComputingDu] = useState<string | null>(null)

  // ── Internal load (does NOT push history) ──────────────────────────────────
  const doLoadDir = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    setViewer(null)
    setEditMode(false)
    setSearch('')
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

  // ── Navigate to new path (push history) ────────────────────────────────────
  const navigateTo = useCallback((p: string) => {
    const hist = historyRef.current.slice(0, histIdxRef.current + 1)
    hist.push(p)
    historyRef.current = hist
    histIdxRef.current = hist.length - 1
    setCanBack(histIdxRef.current > 0)
    setCanForward(false)
    doLoadDir(p)
  }, [doLoadDir])

  function handleBack() {
    if (histIdxRef.current <= 0) return
    histIdxRef.current -= 1
    setCanBack(histIdxRef.current > 0)
    setCanForward(true)
    doLoadDir(historyRef.current[histIdxRef.current])
  }

  function handleForward() {
    if (histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current += 1
    setCanBack(true)
    setCanForward(histIdxRef.current < historyRef.current.length - 1)
    doLoadDir(historyRef.current[histIdxRef.current])
  }

  // ── Load file ───────────────────────────────────────────────────────────────
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

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    doLoadDir(initialPath)
    apiFetch<{ roots: string[] }>('/files/roots').then((r) => setRoots(r.roots)).catch(() => null)
    setFavorites(loadFavorites())
  }, [initialPath, doLoadDir])

  // ── Save file ───────────────────────────────────────────────────────────────
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

  // ── Delete file ─────────────────────────────────────────────────────────────
  async function deleteFile(filePath: string) {
    try {
      await apiFetch(`/files?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' })
      setDeleteTarget(null)
      setViewer(null)
      doLoadDir(currentPath)
    } catch (e) {
      setError((e as Error).message)
      setDeleteTarget(null)
    }
  }

  // ── Create file or directory ─────────────────────────────────────────────────
  async function handleCreate(name: string) {
    const targetPath = `${currentPath}/${name}`
    try {
      if (createModal === 'dir') {
        await apiFetch('/files/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: targetPath }),
        })
      } else {
        await apiFetch('/files/write', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: targetPath, content: '' }),
        })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreateModal(null)
      doLoadDir(currentPath)
    }
  }

  // ── Rename ───────────────────────────────────────────────────────────────────
  async function handleRenameSubmit(entry: FileEntry, newName: string) {
    if (!newName.trim() || newName === entry.name) { setRenaming(null); return }
    const from = `${currentPath}/${entry.name}`
    const to = `${currentPath}/${newName.trim()}`
    try {
      await apiFetch('/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRenaming(null)
      doLoadDir(currentPath)
    }
  }

  // ── Upload ───────────────────────────────────────────────────────────────────
  async function handleUpload(files: File[]) {
    if (!files.length) return
    setUploading(true)
    setUploadError(null)
    const errors: string[] = []
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer()
        await apiUpload(currentPath, file.name, buf)
      } catch (e) {
        errors.push(`${file.name}: ${(e as Error).message}`)
      }
    }
    setUploading(false)
    if (errors.length) setUploadError(errors.join(' · '))
    doLoadDir(currentPath)
  }

  // ── Download ──────────────────────────────────────────────────────────────────
  async function handleDownload(filePath: string, filename: string) {
    try {
      await apiDownload(`/files/download?path=${encodeURIComponent(filePath)}`, filename)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // ── Compute dir size ──────────────────────────────────────────────────────────
  async function handleComputeSize(dirPath: string) {
    setComputingDu(dirPath)
    try {
      const data = await apiFetch<{ path: string; bytes: number }>(`/files/du?path=${encodeURIComponent(dirPath)}`)
      setDirSizes((prev) => ({ ...prev, [dirPath]: data.bytes }))
    } catch { /* silently ignore */ }
    finally { setComputingDu(null) }
  }

  // ── Copy path ────────────────────────────────────────────────────────────────
  function handleCopyPath(p: string) {
    navigator.clipboard.writeText(p).catch(() => null)
  }

  // ── Cd in terminal ───────────────────────────────────────────────────────────
  function handleCdTerminal(dirPath: string) {
    window.location.href = `/console?cd=${encodeURIComponent(dirPath)}`
  }

  // ── Favorites ────────────────────────────────────────────────────────────────
  function toggleFavorite(p: string) {
    setFavorites((prev) => {
      const next = prev.includes(p) ? prev.filter((f) => f !== p) : [...prev, p]
      saveFavorites(next)
      return next
    })
  }

  // ── Path input ────────────────────────────────────────────────────────────────
  function handlePathInputSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPathInputActive(false)
    navigateTo(pathInput)
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleUpload(files)
  }

  // ── Computed values ───────────────────────────────────────────────────────────
  const dirs = listing?.entries.filter((e) => e.isDir).length ?? 0
  const files = listing?.entries.filter((e) => !e.isDir).length ?? 0
  const totalSize = listing?.entries.reduce((acc, e) => acc + (e.isDir ? 0 : e.size), 0) ?? 0
  const isFav = favorites.includes(currentPath)

  return (
    <div
      className="flex flex-col h-full gap-3 min-h-0"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-cyan-500/10 border-2 border-dashed border-cyan-500/40 rounded pointer-events-none">
          <div className="flex items-center gap-2 font-mono text-sm text-cyan-400">
            <Upload size={16} /> Déposer les fichiers ici
          </div>
        </div>
      )}

      {/* Root shortcuts */}
      {roots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 flex-shrink-0">
          {roots.map((root) => (
            <button
              key={root}
              onClick={() => navigateTo(root)}
              className={`font-mono text-[11px] px-2.5 py-1 rounded border transition-all
                ${currentPath === root || currentPath.startsWith(root + '/')
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-base-800 border-border text-text-dim hover:text-text-secondary hover:border-cyan-500/20'}`}
            >
              {root}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {/* History nav */}
        <button onClick={handleBack} disabled={!canBack} title="Précédent"
          className="flex items-center px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 disabled:opacity-25 disabled:cursor-not-allowed text-xs font-mono transition-all flex-shrink-0">
          <ArrowLeft size={12} />
        </button>
        <button onClick={handleForward} disabled={!canForward} title="Suivant"
          className="flex items-center px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 disabled:opacity-25 disabled:cursor-not-allowed text-xs font-mono transition-all flex-shrink-0">
          <ArrowRight size={12} />
        </button>
        <button onClick={() => navigateTo('/opt')} title="Accueil /opt"
          className="flex items-center px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 text-xs font-mono transition-all flex-shrink-0">
          <Home size={12} />
        </button>
        <button onClick={() => doLoadDir(currentPath)} title="Rafraîchir"
          className="flex items-center px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-text-primary hover:border-cyan-500/30 text-xs font-mono transition-all flex-shrink-0">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* Path bar */}
        {pathInputActive ? (
          <form onSubmit={handlePathInputSubmit} className="flex-1 min-w-[160px]">
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
            className="flex-1 min-w-0 min-w-[100px] flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 hover:border-cyan-500/20 transition-all"
          >
            <Breadcrumb currentPath={currentPath} onNavigate={navigateTo} />
          </button>
        )}

        {/* Favorite toggle */}
        <button
          onClick={() => toggleFavorite(currentPath)}
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`flex items-center px-2 py-1.5 rounded border border-border bg-base-800 transition-all text-xs flex-shrink-0
            ${isFav ? 'text-amber-400 border-amber-400/30' : 'text-text-dim hover:text-amber-400 hover:border-amber-400/20'}`}
        >
          {isFav ? <Star size={12} /> : <StarOff size={12} />}
        </button>

        {/* Favorites dropdown */}
        {favorites.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowFavorites((v) => !v)}
              className="font-mono text-[10px] px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-amber-400 hover:border-amber-400/20 transition-all"
            >
              Favoris ({favorites.length})
            </button>
            {showFavorites && (
              <div className="absolute right-0 top-full mt-1 z-30 card min-w-[200px] py-1">
                {favorites.map((fav) => (
                  <button key={fav} onClick={() => { navigateTo(fav); setShowFavorites(false) }}
                    className="w-full text-left px-3 py-1.5 font-mono text-[11px] text-text-dim hover:text-cyan-400 hover:bg-base-700/50 transition-colors truncate">
                    {fav}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim/50 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer…"
            className="font-mono text-[11px] bg-base-800 border border-border rounded pl-6 pr-2 py-1.5 text-text-primary placeholder:text-text-dim/40 focus:outline-none focus:border-cyan-500/30 w-28 transition-all"
          />
        </div>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Uploader des fichiers dans ce dossier"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-mint hover:border-mint/30 disabled:opacity-50 text-xs font-mono transition-all flex-shrink-0"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) { handleUpload(Array.from(e.target.files)); e.target.value = '' } }}
        />

        {/* Create buttons */}
        <button onClick={() => setCreateModal('dir')} title="Nouveau dossier"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-amber-400 hover:border-amber-400/20 text-xs font-mono transition-all flex-shrink-0">
          <FolderPlus size={12} />
        </button>
        <button onClick={() => setCreateModal('file')} title="Nouveau fichier"
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-base-800 text-text-dim hover:text-cyan-400 hover:border-cyan-500/20 text-xs font-mono transition-all flex-shrink-0">
          <FilePlus size={12} />
        </button>
      </div>

      {/* Error banners */}
      {error && (
        <div className="flex items-center justify-between px-3 py-2 rounded border border-crimson/30 bg-crimson/5 font-mono text-xs text-crimson flex-shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}
      {uploadError && (
        <div className="flex items-center justify-between px-3 py-2 rounded border border-amber-400/30 bg-amber-400/5 font-mono text-xs text-amber-400 flex-shrink-0">
          <span>Upload: {uploadError}</span>
          <button onClick={() => setUploadError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Content area */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
        {/* File listing */}
        <div
          className="flex flex-col min-w-0 overflow-hidden"
          style={{ flex: viewer || viewerLoading ? '0 0 45%' : '1 1 100%' }}
        >
          <div className="card flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-text-dim font-mono text-xs">
                <RefreshCw size={13} className="animate-spin" /> Chargement...
              </div>
            ) : listing ? (
              <>
                <FileList
                  listing={listing}
                  currentPath={currentPath}
                  viewingPath={viewer?.path ?? null}
                  search={search}
                  renaming={renaming}
                  dirSizes={dirSizes}
                  computingDu={computingDu}
                  onNavigate={navigateTo}
                  onLoadFile={loadFile}
                  onSetDelete={setDeleteTarget}
                  onRenameStart={setRenaming}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenaming(null)}
                  onCopyPath={handleCopyPath}
                  onCdTerminal={handleCdTerminal}
                  onComputeSize={handleComputeSize}
                  onDownload={handleDownload}
                />

                {/* Status bar */}
                <div className="px-3 py-1.5 border-t border-border/40 flex items-center gap-4">
                  <span className="font-mono text-[10px] text-text-dim/60">{dirs} dossier{dirs > 1 ? 's' : ''}</span>
                  <span className="font-mono text-[10px] text-text-dim/60">{files} fichier{files > 1 ? 's' : ''}</span>
                  {files > 0 && (
                    <span className="font-mono text-[10px] text-text-dim/40 ml-auto">{fmtSize(totalSize)}</span>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Viewer / Editor panel */}
        {(viewer || viewerLoading) && (
          <FileViewer
            viewer={viewer}
            viewerLoading={viewerLoading}
            editMode={editMode}
            editContent={editContent}
            saving={saving}
            saveMsg={saveMsg}
            onEditContentChange={setEditContent}
            onEditStart={() => { setEditMode(true); setEditContent(viewer?.content ?? '') }}
            onSave={saveFile}
            onCancel={() => { setEditMode(false); setEditContent(viewer?.content ?? '') }}
            onClose={() => { setViewer(null); setEditMode(false) }}
            onDelete={() => viewer && setDeleteTarget(viewer.path)}
          />
        )}
      </div>

      {/* Modals */}
      {deleteTarget && (
        <ConfirmDelete
          path={deleteTarget}
          onConfirm={() => deleteFile(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {createModal && (
        <CreateModal
          type={createModal}
          onConfirm={handleCreate}
          onCancel={() => setCreateModal(null)}
        />
      )}

      {/* Click outside to close favorites */}
      {showFavorites && (
        <div className="fixed inset-0 z-20" onClick={() => setShowFavorites(false)} />
      )}
    </div>
  )
}
