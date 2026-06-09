'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MetricPoint } from './types'

interface Props {
  data: MetricPoint[]
  color?: string
  domain?: [number, number]
  unit?: string
  height?: number
  loading?: boolean
}

function CustomTooltip({ active, payload, unit }: {
  active?: boolean
  payload?: Array<{ value: number }>
  unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-base-800 border border-border rounded px-2.5 py-1.5">
      <p className="font-mono text-xs text-cyan-400">
        {payload[0].value.toFixed(1)}{unit ?? '%'}
      </p>
    </div>
  )
}

export function MetricAreaChart({ data, color = '#06b6d4', domain = [0, 100], unit = '%', height = 80, loading = false }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="w-4 h-4 border border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const chartData = data.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    value: p.value,
  }))

  const gradientId = `grad-${color.replace('#', '')}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: '#4a5568', fontSize: 9, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={domain}
          tick={{ fill: '#4a5568', fontSize: 9, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
