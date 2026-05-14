'use client'

/**
 * CommandPalette — global ⌘K (or Ctrl+K) launcher.
 *
 * Lists every navigable route, plus quick actions:
 *   - Switch active client (one entry per accessible Client)
 *   - Toggle dark/light theme (per-tenant key)
 *   - Sign out
 *
 * Mounted in `GlobalOverlays` so it's available everywhere except the auth
 * pages (which are excluded one level up). Built on `cmdk` for the
 * fuzzy-search shell + keyboard navigation.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  Camera,
  Play,
  Bot,
  CheckSquare,
  BookOpen,
  Search,
  Kanban,
  Users,
  Music,
  Megaphone,
  Shield,
  UserCog,
  Building2,
  FileText,
  Telescope,
  Rss,
  Sun,
  Moon,
  LogOut,
  Building,
  Search as CmdSearch,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  group: string
  icon: React.ElementType
  /** Hide unless current user has this role. */
  requiresSuperAdmin?: boolean
}

const NAV: NavItem[] = [
  { group: 'Páginas', label: 'Dashboard',         href: '/',                  icon: LayoutDashboard },
  { group: 'Páginas', label: 'Tareas',            href: '/tareas',            icon: CheckSquare },
  { group: 'Redes sociales', label: 'Instagram',  href: '/instagram',         icon: Camera },
  { group: 'Redes sociales', label: 'YouTube',    href: '/youtube',           icon: Play },
  { group: 'Redes sociales', label: 'TikTok',     href: '/tiktok',            icon: Music },
  { group: 'Contenido', label: 'Contenido',       href: '/contenido',         icon: Kanban },
  { group: 'Contenido', label: 'Bases de negocio', href: '/bases',            icon: BookOpen },
  { group: 'Contenido', label: 'Analizador',      href: '/analizador',        icon: Search },
  { group: 'Contenido', label: 'Competidores',    href: '/competidores',      icon: Users },
  { group: 'Contenido', label: 'Transcript',      href: '/transcript',        icon: FileText },
  { group: 'Contenido', label: 'Content Research', href: '/content-research', icon: Telescope },
  { group: 'Contenido', label: 'Video Feed',      href: '/video-feed',        icon: Rss },
  { group: 'Performance', label: 'Ads',           href: '/ads',               icon: Megaphone },
  { group: 'IA', label: 'Eternity AI',            href: '/ai',                icon: Bot },
  { group: 'Admin', label: 'Resumen',  href: '/admin',         icon: Shield,    requiresSuperAdmin: true },
  { group: 'Admin', label: 'Usuarios', href: '/admin/users',   icon: UserCog,   requiresSuperAdmin: true },
  { group: 'Admin', label: 'Temas', href: '/admin/clients', icon: Building2, requiresSuperAdmin: true },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { profile, clients, refetch } = useAuth()
  const supabase = createClient()

  const close = useCallback(() => setOpen(false), [])

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const cmd = isMac ? e.metaKey : e.ctrlKey
      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goTo = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [close, router],
  )

  const switchClient = useCallback(
    async (clientId: string) => {
      close()
      try {
        await fetch('/api/me/active-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }),
        })
        await refetch()
        // Force a refresh so the layout re-resolves the theme.
        router.refresh()
      } catch {
        // ignored — toast could be added here later
      }
    },
    [close, refetch, router],
  )

  const toggleTheme = useCallback(() => {
    close()
    const html = document.documentElement
    const themeKey = html.dataset.theme || 'eternity'
    const isDark = html.classList.contains('dark')
    const next = isDark ? 'light' : 'dark'
    html.classList.toggle('dark', next === 'dark')
    html.classList.toggle('light', next === 'light')
    try {
      localStorage.setItem(`eternity_theme:${themeKey}`, next)
    } catch {
      // localStorage may be unavailable — fail silently
    }
  }, [close])

  const signOut = useCallback(async () => {
    close()
    await supabase.auth.signOut()
    router.replace('/login')
  }, [close, router, supabase])

  if (!open) return null

  const isSuperAdmin = profile?.globalRole === 'SUPER_ADMIN'
  const visibleNav = NAV.filter((n) => !n.requiresSuperAdmin || isSuperAdmin)
  const grouped = visibleNav.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')

  return (
    <div
      className="fixed inset-0 z-modal-overlay flex items-start justify-center pt-[10vh] px-4"
      style={{
        backgroundColor: 'color-mix(in srgb, #000 45%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={close}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          animation: 'gb-page-enter 0.20s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" loop>
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <CmdSearch size={16} style={{ color: 'var(--muted-foreground)' }} />
            <Command.Input
              autoFocus
              placeholder="Buscar página, alternar tema…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
              style={{ color: 'var(--foreground)' }}
            />
            <kbd
              className="hidden sm:inline-flex items-center justify-center rounded-md px-1.5 h-5 text-[10px] font-medium font-mono"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--muted-foreground)',
              }}
            >
              ESC
            </kbd>
          </div>

          <Command.List
            className="max-h-[60vh] overflow-y-auto py-2 px-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            <Command.Empty>
              <div
                className="px-4 py-8 text-center text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Sin resultados.
              </div>
            </Command.Empty>

            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="cmdk-group [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-eyebrow"
              >
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Command.Item
                      key={item.href}
                      value={`${group} ${item.label} ${item.href}`}
                      onSelect={() => goTo(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm aria-selected:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] aria-selected:text-[var(--accent)]"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <Icon size={15} className="opacity-70" />
                      <span className="flex-1">{item.label}</span>
                      <span
                        className="text-[11px] tabular-nums opacity-50"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {item.href}
                      </span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ))}

            {clients.length > 1 && (
              <Command.Group
                heading="Cambiar tema"
                className="cmdk-group [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-eyebrow"
              >
                {clients.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`switch ${c.name} ${c.slug}`}
                    onSelect={() => void switchClient(c.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm aria-selected:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] aria-selected:text-[var(--accent)]"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <Building size={15} className="opacity-70" />
                    <span className="flex-1">{c.name}</span>
                    {profile?.activeClientId === c.id && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--accent)' }}
                      >
                        activo
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Acciones"
              className="cmdk-group [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-eyebrow"
            >
              <Command.Item
                value="theme toggle dark light modo"
                onSelect={toggleTheme}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm aria-selected:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] aria-selected:text-[var(--accent)]"
                style={{ color: 'var(--foreground)' }}
              >
                {isDark ? <Sun size={15} className="opacity-70" /> : <Moon size={15} className="opacity-70" />}
                <span className="flex-1">{isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}</span>
              </Command.Item>
              <Command.Item
                value="logout sign out cerrar sesion"
                onSelect={() => void signOut()}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm aria-selected:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] aria-selected:text-[var(--accent)]"
                style={{ color: 'var(--foreground)' }}
              >
                <LogOut size={15} className="opacity-70" />
                <span className="flex-1">Cerrar sesión</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div
            className="flex items-center justify-between px-4 py-2.5 text-[11px]"
            style={{
              borderTop: '1px solid var(--border)',
              color: 'var(--muted-foreground)',
              backgroundColor:
                'color-mix(in srgb, var(--background) 50%, var(--card))',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd
                  className="rounded px-1 py-0.5 font-mono"
                  style={{ border: '1px solid var(--border)' }}
                >
                  ↑↓
                </kbd>
                navegar
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd
                  className="rounded px-1 py-0.5 font-mono"
                  style={{ border: '1px solid var(--border)' }}
                >
                  ↵
                </kbd>
                seleccionar
              </span>
            </div>
            <span>
              ⌘K para abrir
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}
