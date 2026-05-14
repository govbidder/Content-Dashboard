'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X, Loader2 } from 'lucide-react'

type ClientRow = { id: string; name: string; slug: string }

interface Props {
  editing: ClientRow | null
  onClose: () => void
  onSaved: () => void
}

export function ClientFormModal({ editing, onClose, onSaved }: Props) {
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState(editing?.name ?? '')
  const [slug, setSlug] = useState(editing?.slug ?? '')
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
      const body: { name: string; slug?: string } = { name: name.trim() }
      if (slug.trim()) body.slug = slug.trim()
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
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Editar tema' : 'Nuevo tema'}
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl flex flex-col"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
        }}
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
            {editing ? 'Editar tema' : 'Nuevo tema'}
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
              placeholder="Mi tema"
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
              placeholder="mi-tema"
              className="w-full text-xs font-mono rounded-lg px-3 py-2 outline-none"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#E05252' }}>{error}</p>
          )}
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !name.trim()}
            className="btn btn-primary btn-sm"
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
