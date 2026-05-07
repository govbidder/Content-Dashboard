'use client'

import { useEffect, useState, useRef } from 'react'
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logClientError } from '@/lib/client-errors'
import { useAuth, type ClientOpt } from './AuthProvider'

export function ClientSwitcher() {
  const { profile, clients, loading, refetch } = useAuth()
  const activeId = profile?.activeClientId ?? null
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function selectClient(id: string) {
    if (id === activeId || pendingId) return
    setPendingId(id)
    try {
      const res = await fetch('/api/me/active-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Error ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`)
      }
      const next = clients.find((c) => c.id === id)
      if (next?.themeKey) {
        const html = document.documentElement
        Array.from(html.classList).forEach((c) => {
          if (c.startsWith('brand-')) html.classList.remove(c)
        })
        html.classList.add(`brand-${next.themeKey}`)
      }
      await refetch()
      window.location.reload()
    } catch (err) {
      logClientError(err, 'ClientSwitcher:selectClient')
      setPendingId(null)
    }
  }

  const active = clients.find((c) => c.id === activeId) ?? null
  const empty = !loading && clients.length === 0
  const label = active?.name ?? (empty ? 'Sin clientes' : loading ? 'Cargando…' : 'Elegir cliente')

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={empty || loading}
        onClick={() => !empty && setOpen((o) => !o)}
        title={empty ? 'No tienes clientes asignados' : label}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-opacity',
          (empty || loading) ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer',
        )}
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
          minWidth: '140px',
        }}
      >
        <Building2 size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
        <span
          className="flex-1 text-left truncate"
          style={{ color: empty ? 'var(--muted-foreground)' : 'var(--foreground)' }}
        >
          {loading ? 'Cargando…' : label}
        </span>
        {!empty && (
          <ChevronDown
            size={12}
            style={{ color: 'var(--muted-foreground)' }}
            className={cn('transition-transform flex-shrink-0', open && 'rotate-180')}
          />
        )}
      </button>

      {open && clients.length > 0 && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-2xl py-1 z-modal max-h-64 overflow-y-auto"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {clients.map((c) => (
            <ClientRow
              key={c.id}
              option={c}
              active={c.id === activeId}
              pending={pendingId === c.id}
              onSelect={selectClient}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientRow({
  option,
  active,
  pending,
  onSelect,
}: {
  option: ClientOpt
  active: boolean
  pending: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:opacity-80 transition-opacity text-left"
      style={{
        color: active ? 'var(--accent)' : 'var(--foreground)',
      }}
    >
      <Building2 size={12} style={{ color: active ? 'var(--accent)' : 'var(--muted-foreground)', flexShrink: 0 }} />
      <span className="flex-1 truncate font-medium">{option.name}</span>
      {pending ? (
        <Loader2 size={12} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
      ) : active ? (
        <Check size={12} style={{ color: 'var(--accent)' }} />
      ) : null}
    </button>
  )
}
