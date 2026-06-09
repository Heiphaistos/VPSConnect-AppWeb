'use client'

import useSWR from 'swr'
import { apiFetch } from '@/lib/api'
import type { SystemStats, Container, Pm2Process } from '@/lib/types'

interface Snapshot {
  system: SystemStats
  containers: Container[]
  processes: Pm2Process[]
  updatedAt: number
}

interface HistoryPoint { timestamp: number; value: number }
interface HistoryResponse { metric: string; points: HistoryPoint[] }

const fetcher = (url: string) => apiFetch<Snapshot>(url)

export function useSnapshot(refreshInterval = 5_000) {
  const { data, error, isLoading } = useSWR<Snapshot>('/metrics/snapshot', fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 4_000,
  })
  return { snapshot: data, error, loading: isLoading }
}

export function useHistory(metric: string, rangeHours = 1) {
  const end = Math.floor(Date.now() / 1000)
  const start = end - rangeHours * 3600
  const url = `/metrics/history?metric=${metric}&start=${start}&end=${end}&step=15`

  const { data, error } = useSWR<HistoryResponse>(url, (u: string) => apiFetch<HistoryResponse>(u), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })

  return { points: data?.points ?? [], error }
}
