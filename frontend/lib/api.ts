export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api'
export const WS_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`)
  : ''

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export function createWebSocket(path: string): WebSocket {
  return new WebSocket(`${WS_BASE}${path}`)
}

export async function apiDownload(apiPath: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${apiPath}`, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function apiUpload(destPath: string, filename: string, data: ArrayBuffer): Promise<void> {
  const url = `${API_BASE}/files/upload?path=${encodeURIComponent(destPath)}&name=${encodeURIComponent(filename)}`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: data,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
}
