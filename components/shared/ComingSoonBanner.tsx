interface ComingSoonBannerProps {
  title: string
  description: string
  features: string[]
  prerequisite?: string
}

export function ComingSoonBanner({ title, description, features, prerequisite }: ComingSoonBannerProps) {
  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <div
        className="rounded-xl px-6 py-8 mb-8 text-center"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-2xl" style={{ color: 'var(--accent)' }}>◇</span>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            Próximamente
          </span>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>{title}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{description}</p>

        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {features.map((f) => (
            <span
              key={f}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {prerequisite && (
        <p className="text-center text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
          {prerequisite}
        </p>
      )}
    </div>
  )
}
