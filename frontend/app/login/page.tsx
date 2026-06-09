'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
    // Check if already authenticated
    fetch('/api/auth/me').then((r) => {
      if (r.ok) router.replace('/')
    })
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include',
    })

    if (res.ok) {
      router.replace('/')
    } else {
      setGlitching(true)
      setError('ACCÈS REFUSÉ — IDENTIFIANTS INVALIDES')
      setPassword('')
      setTimeout(() => setGlitching(false), 600)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-base-950 bg-grid flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-glow-cyan opacity-40 pointer-events-none" />

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 text-text-dim font-mono text-xs tracking-widest opacity-60">
        VPSCONNECT::AUTH_MODULE
      </div>
      <div className="absolute top-8 right-8 font-mono text-xs text-text-dim opacity-60">
        {new Date().toISOString().slice(0, 19).replace('T', ' ')}
      </div>
      <div className="absolute bottom-8 left-8 font-mono text-xs text-text-dim opacity-40">
        heiphaistos.org / v1.0.0
      </div>

      {/* Login card */}
      <div className={`relative w-full max-w-sm mx-4 transition-all duration-100 ${glitching ? 'translate-x-[2px] brightness-150' : ''}`}>
        {/* Top border accent */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-0 rounded-t" />

        <div className="card p-8 rounded-t-none">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-base-700 border border-border mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
              VPSConnect
            </h1>
            <p className="font-mono text-xs text-text-dim mt-1 tracking-widest">SECURE ACCESS</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text-dim tracking-widest mb-2">
                MOT DE PASSE ADMINISTRATEUR
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-base-900 border border-border rounded-md px-4 py-3 font-mono text-sm text-text-primary
                             placeholder-text-dim outline-none transition-all duration-200
                             focus:border-cyan-500 focus:shadow-glow-cyan focus:bg-base-950"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-1.5 h-1.5 rounded-full ${password ? 'bg-mint status-pulse' : 'bg-muted'}`} />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-crimson/10 border border-crimson/30 rounded px-3 py-2">
                <p className="font-mono text-xs text-crimson tracking-wide">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-md font-display font-semibold text-sm tracking-wider transition-all duration-200
                         bg-cyan-500 hover:bg-cyan-400 text-base-950
                         disabled:opacity-40 disabled:cursor-not-allowed
                         active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-base-950 border-t-transparent rounded-full animate-spin" />
                  VÉRIFICATION...
                </span>
              ) : 'ACCÉDER AU DASHBOARD'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="font-mono text-xs text-text-dim text-center">
              Session expirée après 24h d&apos;inactivité
            </p>
          </div>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </div>
  )
}
