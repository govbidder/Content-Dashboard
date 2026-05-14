'use client'

import { useContext, useEffect, useState } from 'react'
import { Eye, Users, TrendingUp, Menu } from 'lucide-react'
import { formatM, formatPercent } from '@/lib/utils/formatters'
import { ThemeToggle } from './ThemeToggle'
import { MobileSidebarContext } from './LayoutShell'

interface GlobalStats {
  followers: number
  views: number
  engagementRate: number
}

const EMPTY = '—'

export function TopBar() {
  const { open: openMobileSidebar } = useContext(MobileSidebarContext)
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me/global-stats')
      .then((r) => (r.ok ? (r.json() as Promise<GlobalStats | null>) : null))
      .then((data) => {
        if (cancelled) return
        setStats(data)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Until the fetch resolves we show the same dash placeholders so the
  // pills don't flash mock numbers during hydration.
  const metrics = [
    { Icon: Eye,        label: 'VIEWS',     value: stats ? formatM(stats.views)               : EMPTY, color: 'var(--stat-icon)',           delay: '0ms'   },
    { Icon: Users,      label: 'FOLLOWERS', value: stats ? formatM(stats.followers)           : EMPTY, color: 'var(--stat-icon)',           delay: '60ms'  },
    { Icon: TrendingUp, label: 'ENG. RATE', value: stats ? formatPercent(stats.engagementRate) : EMPTY, color: 'var(--stat-icon-secondary)', delay: '120ms' },
  ]

  return (
    <header
      className="sticky top-0 z-sticky h-16 flex items-center justify-between gap-4 px-4 md:px-6 backdrop-blur-xl"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--background) 80%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Mobile menu + identity block */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Abrir menú"
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl transition-colors cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Menu size={18} />
        </button>
        <div
          className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ring-2 transition-shadow duration-200"
            style={{
              background: 'var(--gradient-accent)',
              color: 'var(--accent-foreground)',
              boxShadow:
                '0 4px 14px -4px color-mix(in srgb, var(--accent) 50%, transparent)',
              ['--tw-ring-color' as string]:
                'color-mix(in srgb, var(--background) 100%, transparent)',
            }}
          >
            TU
          </span>
          <div className="hidden sm:flex items-center gap-2">
            <span
              className="text-sm font-semibold leading-none"
              style={{ color: 'var(--foreground)' }}
            >
              Tu Cuenta
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-[0.12em] animate-glow-pulse"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--accent-foreground)',
              }}
            >
              PRO
            </span>
          </div>
        </div>
      </div>

      {/* Center metric pills */}
      <div
        className="hidden lg:flex items-center gap-1 rounded-xl border px-1 py-1"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--card) 60%, transparent)',
          borderColor: 'var(--border)',
        }}
        aria-busy={!loaded || undefined}
        aria-label="Métricas globales"
      >
        {metrics.map(({ Icon, label, value, color, delay }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ animationDelay: delay, animationFillMode: 'both' }}
          >
            <Icon size={13} style={{ color }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {label}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: 'var(--foreground)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
