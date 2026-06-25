'use client'

import { RefreshCw, Edit3, X, Trash2, Save } from 'lucide-react'

export interface ReadResponse {
  path: string
  content: string
  size: number
  mtime: string
}

function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

interface FileViewerProps {
  viewer: ReadResponse | null
  viewerLoading: boolean
  editMode: boolean
  editContent: string
  saving: boolean
  saveMsg: string | null
  onEditContentChange: (v: string) => void
  onEditStart: () => void
  onSave: () => void
  onCancel: () => void
  onClose: () => void
  onDelete: () => void
}

export function FileViewer({
  viewer, viewerLoading, editMode, editContent, saving, saveMsg,
  onEditContentChange, onEditStart, onSave, onCancel, onClose, onDelete,
}: FileViewerProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0 gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-text-primary truncate">{viewer?.path.split('/').pop()}</p>
          {viewer && (
            <p className="font-mono text-[10px] text-text-dim/60">
              {fmtSize(viewer.size)} · {fmtDate(viewer.mtime)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {saveMsg && (
            <span className={`font-mono text-[10px] ${saveMsg.startsWith('Err') ? 'text-crimson' : 'text-mint'}`}>
              {saveMsg}
            </span>
          )}
          {viewer && !editMode && (
            <button
              onClick={onEditStart}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-base-700 text-text-dim hover:text-mint hover:border-mint/40 transition-all text-[11px] font-mono"
            >
              <Edit3 size={11} /> Éditer
            </button>
          )}
          {editMode && (
            <>
              <button
                onClick={onCancel}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border text-text-dim text-[11px] font-mono hover:text-text-primary transition-colors"
              >
                <X size={11} /> Annuler
              </button>
              <button
                onClick={onSave}
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
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-base-700 text-text-dim hover:text-crimson hover:border-crimson/40 transition-all"
            >
              <Trash2 size={11} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-primary transition-colors p-1"
          >
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
          onChange={(e) => onEditContentChange(e.target.value)}
          className="flex-1 resize-none p-3 font-mono text-[12px] text-text-primary bg-base-900 focus:outline-none leading-relaxed"
          spellCheck={false}
        />
      ) : viewer ? (
        <pre className="flex-1 overflow-auto p-3 font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
          {viewer.content}
        </pre>
      ) : null}
    </div>
  )
}
