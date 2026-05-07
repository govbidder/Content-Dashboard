'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X, Loader2 } from 'lucide-react'

type ClientRow = { id: string; name: string; slug: string; themeKey?: string }

const THEME_OPTIONS = [
  { value: 'eternity', label: 'Eternity (rojo + ivory)' },
  { value: 'govbidder', label: 'Govbidder (rojo + navy, SaaS)' },
] as const

interface Props {
  editing: ClientRow | null
  onClose: () => void
  onSaved: () => void
}

export function ClientFormModal({ editing, onClose, onSaved }: Props) {
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState(editing?.name ?? '')
  const [slug, setSlug] = useState(editing?.slug ?? '')
  const [themeKey, setThemeKey] = useState(editing?.themeKey ?? 'eternity')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

   
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function submit() {
    setError('')
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setBusy(true)
    try {
      const body: { name: string; slug?: string; themeKey?: string } = { name: name.trim() }
      if (slug.trim()) body.slug = slug.trim()
      body.themeKey = themeKey
      const res = editing
        ? await fetch(`/api/admin/clients/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Error al guardar')
        return
      }
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <motion.div
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {editing ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70 transition-opacity">
            <X size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
              Nombre
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi cliente"
              className="w-full text-xs rounded-lg px-3 py-2 outline-none"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
              Slug <span style={{ opacity: 0.6 }}>(opcional — se genera del nombre)</span>
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mi-cliente"
              className="w-full text-xs font-mono rounded-lg px-3 py-2 outline-none"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--muted-foreground)' }}>
              Tema visual
            </label>
            <select
              value={themeKey}
              onChange={(e) => setThemeKey(e.target.value)}
              className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#E05252' }}>{error}</p>
          )}
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="text-xs px-4 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            {editing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
