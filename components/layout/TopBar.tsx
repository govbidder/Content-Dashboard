'use client'

import { useContext, useEffect, useState } from 'react'
import { Eye, Users, TrendingUp, Menu } from 'lucide-react'
import { formatM, formatPercent } from '@/lib/utils/formatters'
import { ThemeToggle } from './ThemeToggle'
import { MobileSidebarContext } from './LayoutShell'
import { ClientSwitcher } from './ClientSwitcher'

interface GlobalStats {
  followers: number
  views: number
  engagementRate: number
}

export function TopBar() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loaded, setLoaded] = useState(false)
  const { open: openMobileSidebar } = useContext(MobileSidebarContext)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me/global-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GlobalStats | null) => {
        if (cancelled) return
        setStats(data)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <header
      className="sticky top-0 z-sticky h-14 flex items-center justify-between px-6"
      style={{
        backgroundColor: 'var(--background)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Profile */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open menu"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Menu size={18} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-shadow duration-200 hover:shadow-[0_0_0_2px_var(--accent),0_0_0_4px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
          style={{ backgroundColor: 'var(--accent)' }}>TU</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Tu Cuenta</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide animate-glow-pulse"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>PRO</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        {[
          { Icon: Eye,        label: 'VIEWS',     value: stats ? formatM(stats.views)                : '—', delay: '0ms'   },
          { Icon: Users,      label: 'FOLLOWERS', value: stats ? formatM(stats.followers)            : '—', delay: '60ms'  },
          { Icon: TrendingUp, label: 'ENG. RATE', value: stats ? formatPercent(stats.engagementRate) : '—', delay: '120ms' },
        ].map(({ Icon, label, value, delay }) => (
          <div
            key={label}
            className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ animationDelay: delay, animationFillMode: 'both' }}
            title={loaded && !stats ? 'Conectá una red social para ver tus stats' : undefined}
          >
            <Icon size={14} style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: stats ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <ClientSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
