'use client'

import { useState } from 'react'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { logClientError } from '@/lib/client-errors'

type GlobalRole = 'PENDING' | 'MEMBER' | 'SUPER_ADMIN'
type ClientOpt = { id: string; name: string; slug: string }

interface Props {
  allClients: ClientOpt[]
  onClose: () => void
  onCreated: () => void
}

export function CreateUserModal({ allClients, onClose, onCreated }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [globalRole, setGlobalRole] = useState<GlobalRole>('MEMBER')
  const [clientId, setClientId] = useState(allClients[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
          globalRole,
          clientId: clientId || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      toast.success('Usuario creado')
      onCreated()
      onClose()
    } catch (err) {
      logClientError(err, 'CreateUserModal:submit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Crear usuario
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Contraseña * (mín. 8 caracteres)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-3 py-2 pr-9 text-sm outline-none"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                style={{ color: 'var(--foreground)' }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Nombre (opcional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Cristián"
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                Rol
              </label>
              <select
                value={globalRole}
                onChange={(e) => setGlobalRole(e.target.value as GlobalRole)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                <option value="">— Sin asignar —</option>
                {allClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Creando…
              </span>
            ) : (
              'Crear usuario'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
