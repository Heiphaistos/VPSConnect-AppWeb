import type { ContainerState, ProcessState } from '@/lib/types'

type State = ContainerState | ProcessState

const stateConfig: Record<State, { dot: string; text: string; label: string }> = {
  deployed: { dot: 'bg-mint status-pulse', text: 'text-mint', label: 'ACTIF' },
  pending:  { dot: 'bg-amber status-pulse', text: 'text-amber', label: 'EN COURS' },
  failed:   { dot: 'bg-crimson', text: 'text-crimson', label: 'ERREUR' },
}

export function StateBadge({ state }: { state: State }) {
  const cfg = stateConfig[state]
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs tracking-widest ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function PercentBar({
  value,
  colorClass,
  showLabel = true,
}: {
  value: number
  colorClass?: string
  showLabel?: boolean
}) {
  const color = colorClass ?? (value > 85 ? 'bg-crimson' : value > 65 ? 'bg-amber' : 'bg-cyan-500')
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-base-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 progress-fill ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs text-text-dim w-8 text-right">{value.toFixed(0)}%</span>
      )}
    </div>
  )
}
