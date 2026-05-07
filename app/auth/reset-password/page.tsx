'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

/**
 * Landing for the Supabase password-reset magic link.
 *
 * Flow:
 *  1. User clicks email link → Supabase validates token, sets session cookie
 *  2. This page loads with active session; user sets new password
 *  3. Call supabase.auth.updateUser({ password }) → success → redirect /login
 *
 * If the user lands here WITHOUT a valid session (expired link, shared URL),
 * we send them back to /login with a toast.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Intentional setState in effect: confirming session is an async side
    // effect, not a render-derived value.
     
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        toast.error('El enlace de restablecimiento expiró o no es válido.')
        router.replace('/login')
        return
      }
      setCheckingSession(false)
    })()
     
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    toast.success('Contraseña actualizada. Inicia sesión con la nueva.')
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const inputStyle = {
    backgroundColor: 'rgba(22, 17, 18, 0.6)',
    border: '1px solid var(--border, #2A1C1F)',
    color: 'var(--foreground)',
  } as const

  if (checkingSession) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--background, #0F0B0C)', color: 'var(--foreground)' }}
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{
        backgroundColor: 'var(--background, #0F0B0C)',
        color: 'var(--foreground)',
      }}
    >
      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-10 flex flex-col items-center">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold shadow-lg"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              boxShadow: '0 10px 30px rgba(142, 31, 47, 0.4)',
            }}
          >
            E
          </div>
          <p
            className="text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: 'var(--muted-foreground, #9A8F89)' }}
          >
            Content Dashboard · eternity
          </p>
        </div>

        <div
          className="rounded-3xl p-8 backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(22, 17, 18, 0.75)',
            border: '1px solid var(--border, #2A1C1F)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          <h1
            className="text-[28px] font-bold leading-tight tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground, #9A8F89)' }}>
            Elige una contraseña nueva para tu cuenta.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--muted-foreground, #9A8F89)' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Confirmar contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                style={inputStyle}
              />
            </div>

            {error && <p className="text-center text-sm" style={{ color: '#ef4444' }}>{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{
                backgroundColor: 'var(--foreground)',
                color: '#000',
                boxShadow: '0 10px 30px rgba(245, 237, 227, 0.15)',
              }}
            >
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {saving ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
