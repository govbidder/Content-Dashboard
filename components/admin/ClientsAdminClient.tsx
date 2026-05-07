'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logClientError } from '@/lib/client-errors'
import { ClientFormModal } from './ClientFormModal'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

type ClientRow = {
  id: string
  name: string
  slug: string
  createdAt: string
  accessCount: number
}

export function ClientsAdminClient() {
  const [rows, setRows] = useState<ClientRow[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClientRow | null>(null)
  const [deleting, setDeleting] = useState<ClientRow | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/clients')
    if (!res.ok) return
    const data = await res.json()
    setRows(data.clients)
  }, [])

  useEffect(() => {
     
    load()
  }, [load])

  async function handleDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/clients/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      toast.success(`Cliente eliminado`)
      setDeleting(null)
      load()
    } catch (err) {
      logClientError(err, 'ClientsAdminClient:handleDelete')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <Plus size={13} /> Nuevo cliente
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="col-span-4">Nombre</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-2">Usuarios</div>
          <div className="col-span-2">Creado</div>
          <div className="col-span-1 text-right">Acciones</div>
        </div>

        {rows === null && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Cargando…
          </div>
        )}
        {rows?.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Sin clientes todavía.
          </div>
        )}

        {rows?.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-xs"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="col-span-4 truncate font-medium" style={{ color: 'var(--foreground)' }}>
              {r.name}
            </div>
            <div className="col-span-3 font-mono truncate" style={{ color: 'var(--muted-foreground)' }}>
              {r.slug}
            </div>
            <div className="col-span-2" style={{ color: 'var(--muted-foreground)' }}>
              {r.accessCount}
            </div>
            <div className="col-span-2" style={{ color: 'var(--muted-foreground)' }}>
              {new Date(r.createdAt).toLocaleDateString('es-ES')}
            </div>
            <div className="col-span-1 flex items-center justify-end gap-1">
              <button
                onClick={() => { setEditing(r); setFormOpen(true) }}
                title="Editar"
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => setDeleting(r)}
                title="Eliminar"
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: '#E05252' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <ClientFormModal
          editing={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSaved={() => { setFormOpen(false); setEditing(null); load() }}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          title="Eliminar cliente"
          description={
            <>
              Se eliminará <strong>{deleting.name}</strong> y TODOS sus datos asociados
              (competidores, reels, tareas, contenido, etc.) de forma permanente.
              Esta acción no se puede deshacer.
            </>
          }
          confirmLabel={busy ? 'Eliminando…' : 'Eliminar definitivamente'}
          busy={busy}
          icon={busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
