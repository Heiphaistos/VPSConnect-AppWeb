'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Container,
  Cpu,
  LogOut,
  Radio,
} from 'lucide-react'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/docker', label: 'Docker', icon: Container },
  { href: '/pm2', label: 'PM2', icon: Cpu },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-base-900 border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-base-700 border border-border flex items-center justify-center flex-shrink-0">
            <Radio size={14} className="text-cyan-400" />
          </div>
          <div>
            <p className="font-display font-bold text-text-primary text-sm leading-tight">VPSConnect</p>
            <p className="font-mono text-[10px] text-text-dim tracking-widest">MONITOR</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group',
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-text-secondary hover:bg-base-800 hover:text-text-primary',
              )}
            >
              <Icon size={15} className={active ? 'text-cyan-400' : 'text-text-dim group-hover:text-text-secondary'} />
              <span className={clsx('font-mono text-xs tracking-wide', active && 'font-medium')}>{label}</span>
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-border pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-dim hover:text-crimson hover:bg-crimson/10 transition-all duration-150"
        >
          <LogOut size={15} />
          <span className="font-mono text-xs tracking-wide">Déconnexion</span>
        </button>
        <p className="font-mono text-[10px] text-text-dim/40 text-center mt-3 tracking-widest">
          heiphaistos.org
        </p>
      </div>
    </aside>
  )
}
