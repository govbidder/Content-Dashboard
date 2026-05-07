import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  ctaOnClick?: () => void
  variant?: 'centered' | 'inline'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  variant = 'centered',
}: EmptyStateProps) {
  const wrapperClasses =
    variant === 'centered'
      ? 'flex-1 flex items-center justify-center p-8 min-h-[60vh]'
      : 'p-6'

  const cta =
    ctaLabel && (ctaHref || ctaOnClick) ? (
      ctaHref ? (
        <Link
          href={ctaHref}
          className="text-xs px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          {ctaLabel}
        </Link>
      ) : (
        <button
          onClick={ctaOnClick}
          className="text-xs px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          {ctaLabel}
        </button>
      )
    ) : null

  return (
    <div className={wrapperClasses}>
      <div
        className="rounded-xl p-8 flex flex-col items-center text-center gap-3 max-w-md w-full"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px dashed var(--border)',
        }}
      >
        <Icon size={32} style={{ color: 'var(--muted-foreground)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        </div>
        {cta}
      </div>
    </div>
  )
}
