'use client'

import { ComingSoonBanner } from '@/components/shared/ComingSoonBanner'

export function AdsContent() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          Ads Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Rendimiento centralizado de Meta Ads y TikTok Ads.
        </p>
      </div>

      <ComingSoonBanner
        title="Ads Dashboard"
        description="Vista unificada de tus campañas de Meta Ads y TikTok Ads, con métricas de spend, ROAS y rendimiento por creativo."
        features={['Meta Ads', 'TikTok Ads', 'ROAS por campaña', 'Análisis de creativos']}
        prerequisite="Requiere conectar las cuentas publicitarias (Meta Business + TikTok Ads Manager)."
      />
    </div>
  )
}
