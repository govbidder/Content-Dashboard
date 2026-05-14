'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, Settings, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { logClientError } from '@/lib/client-errors'
import { ClientAccessModal } from './ClientAccessModal'
import { CreateUserModal } from './CreateUserModal'

type GlobalRole = 'PENDING' | 'MEMBER' | 'SUPER_ADMIN'

type User = {
  id: string
  email: string | null
  displayName: string | null
  globalRole: GlobalRole
  createdAt: string
  clientAccess: { clientId: string; clientName: string; clientSlug: string }[]
}

type ClientOpt = { id: string; name: string; slug: string }

const ROLE_FILTERS: { key: 'ALL' | GlobalRole; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'MEMBER', label: 'Miembros' },
  { key: 'SUPER_ADMIN', label: 'Admins' },
]

function roleChipColor(role: GlobalRole): { bg: string; fg: string } {
  switch (role) {
    case 'PENDING':
      return { bg: '#B08A4A22', fg: '#B08A4A' }
    case 'MEMBER':
      return { bg: 'var(--muted)', fg: 'var(--foreground)' }
    case 'SUPER_ADMIN':
      return { bg: 'var(--accent)', fg: 'var(--accent-foreground)' }
  }
}

export function UsersAdminClient() {
  const search = useSearchParams()
  const initialFilter = (search.get('filter') as 'ALL' | GlobalRole | null) ?? 'ALL'
  const [users, setUsers] = useState<User[] | null>(null)
  const [clients, setClients] = useState<ClientOpt[]>([])
  const [filter, setFilter] = useState<'ALL' | GlobalRole>(
    ROLE_FILTERS.some((r) => r.key === initialFilter) ? initialFilter : 'ALL',
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [modalUser, setModalUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (!res.ok) return
    const data = await res.json()
    setUsers(data.users)
  }, [])

  const loadClients = useCallback(async () => {
    const res = await fetch('/api/admin/clients')
    if (!res.ok) return
    const data = await res.json()
    setClients(data.clients.map((c: { id: string; name: string; slug: string }) => ({
      id: c.id, name: c.name, slug: c.slug,
    })))
  }, [])

  useEffect(() => {
    loadUsers()
    loadClients()
  }, [loadUsers, loadClients])

  async function setRole(user: User, globalRole: GlobalRole) {
    if (busyId) return
    setBusyId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      toast.success(`Rol actualizado`)
      await loadUsers()
    } catch (err) {
      logClientError(err, 'UsersAdminClient:changeRole')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(() => {
    if (!users) return []
    if (filter === 'ALL') return users
    return users.filter((u) => u.globalRole === filter)
  }, [users, filter])

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
        {ROLE_FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 text-xs rounded-xl transition-opacity"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'var(--muted)',
                color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          )
        })}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <UserPlus size={13} /> Crear usuario
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Nombre</div>
          <div className="col-span-2">Rol</div>
          <div className="col-span-3">Clientes</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {users === null && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Cargando…
          </div>
        )}

        {users !== null && filtered.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Sin resultados
          </div>
        )}

        {filtered.map((u) => {
          const role = roleChipColor(u.globalRole)
          const isBusy = busyId === u.id
          return (
            <div
              key={u.id}
              className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-xs"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="col-span-3 truncate" style={{ color: 'var(--foreground)' }}>
                {u.email ?? '—'}
              </div>
              <div className="col-span-2 truncate" style={{ color: 'var(--muted-foreground)' }}>
                {u.displayName ?? '—'}
              </div>
              <div className="col-span-2">
                <select
                  value={u.globalRole}
                  onChange={(e) => setRole(u, e.target.value as GlobalRole)}
                  disabled={isBusy}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg outline-none"
                  style={{
                    backgroundColor: role.bg,
                    color: role.fg,
                    border: '1px solid var(--border)',
                  }}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className="col-span-3 flex flex-wrap gap-1">
                {u.clientAccess.length === 0 ? (
                  <span style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>—</span>
                ) : (
                  u.clientAccess.map((a) => (
                    <span
                      key={a.clientId}
                      className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{
                        backgroundColor: 'var(--muted)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {a.clientName}
                    </span>
                  ))
                )}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                {u.globalRole === 'PENDING' && (
                  <button
                    onClick={() => setRole(u, 'MEMBER')}
                    disabled={isBusy}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                  >
                    {isBusy ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <Check size={11} /> Aprobar
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setModalUser(u)}
                  className="px-2.5 py-1 rounded-lg text-[11px] transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                  title="Gestionar acceso"
                >
                  <span className="flex items-center gap-1">
                    <Settings size={11} /> Acceso
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {modalUser && (
        <ClientAccessModal
          user={modalUser}
          allClients={clients}
          onClose={() => setModalUser(null)}
          onChanged={loadUsers}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          allClients={clients}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadUsers}
        />
      )}
    </>
  )
}
