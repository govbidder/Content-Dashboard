'use client'

import { ComingSoonBanner } from '@/components/shared/ComingSoonBanner'

export function TikTokContent() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
          TikTok Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Análisis de rendimiento y crecimiento en TikTok.
        </p>
      </div>

      <ComingSoonBanner
        title="TikTok Analytics"
        description="Métricas detalladas de tu cuenta de TikTok: videos, tendencias, audiencia y crecimiento."
        features={['Videos top', 'Tendencias', 'Demografía', 'Crecimiento']}
        prerequisite="Conectá tu cuenta de TikTok desde la sección de integraciones."
      />
    </div>
  )
}
