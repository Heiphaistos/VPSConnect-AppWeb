export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${units[i]}`
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

export function formatUptime(seconds: number): string {
  return formatDuration(seconds * 1000)
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

export function relativeTime(isoOrMs: string | number): string {
  const ts = typeof isoOrMs === 'string' ? Date.parse(isoOrMs) : isoOrMs
  const diff = Date.now() - ts
  if (diff < 60_000) return 'À l\'instant'
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)}h`
  return `Il y a ${Math.floor(diff / 86_400_000)}j`
}
