import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  glow?: 'cyan' | 'mint' | 'red' | 'none'
  padding?: boolean
}

const glowMap = {
  cyan: 'glow-cyan',
  mint: 'glow-mint',
  red: 'glow-red',
  none: '',
}

export function Card({ children, className, glow = 'none', padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        'card animate-fade-in',
        glow !== 'none' && glowMap[glow],
        padding && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="font-display font-semibold text-text-primary text-sm tracking-wide">{title}</h2>
        {subtitle && <p className="font-mono text-xs text-text-dim mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'cyan' | 'mint' | 'red' | 'amber'
}) {
  const accentColor = {
    cyan: 'text-cyan-400',
    mint: 'text-mint',
    red: 'text-crimson',
    amber: 'text-amber',
  }[accent ?? 'cyan']

  return (
    <div className="card p-4">
      <p className="font-mono text-xs text-text-dim tracking-widest mb-2">{label}</p>
      <p className={`font-mono text-2xl font-medium ${accentColor}`}>{value}</p>
      {sub && <p className="font-mono text-xs text-text-dim mt-1">{sub}</p>}
    </div>
  )
}
