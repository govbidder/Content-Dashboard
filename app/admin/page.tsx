import Link from 'next/link'
import { Users, Clock, Building2, Shield } from 'lucide-react'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const [userCount, pendingCount, clientCount] = await Promise.all([
    db.profile.count(),
    db.profile.count({ where: { globalRole: 'PENDING' } }),
    db.client.count(),
  ])

  const cards = [
    {
      label: 'Usuarios totales',
      value: userCount,
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Aprobaciones pendientes',
      value: pendingCount,
      icon: Clock,
      href: '/admin/users?filter=PENDING',
      highlight: pendingCount > 0,
    },
    {
      label: 'Temas',
      value: clientCount,
      icon: Building2,
      href: '/admin/clients',
    },
  ]

  return (
    <div className="page-shell" style={{ maxWidth: '64rem' }}>
      <PageHeader
        eyebrow="Admin"
        title="Panel de administración"
        description="Gestión de usuarios, roles y temas."
        icon={Shield}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, href, highlight }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl p-5 card-lift"
            style={{
              backgroundColor: 'var(--card)',
              border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
              boxShadow: 'var(--shadow-card-sm)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-eyebrow">{label}</span>
              <span
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
                }}
              >
                <Icon size={16} />
              </span>
            </div>
            <div
              className="text-display tabular-nums"
              style={{ color: 'var(--foreground)' }}
            >
              {value}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
