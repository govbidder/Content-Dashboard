'use client'

import { usePeriod } from '@/hooks/usePeriod'
import { VisitasChart } from '@/components/dashboard/VisitasChart'
import { StatCard } from '@/components/dashboard/StatCard'
import { DesgloseTrafico } from '@/components/dashboard/DesgloseTrafico'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { TrendingUp, Users, Heart, MessageCircle, Trophy, Clapperboard, Camera } from 'lucide-react'
import Link from 'next/link'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { userReelToView } from '@/lib/instagram/to-reel-view'
import { EmptyState } from '@/components/shared/EmptyState'

const _now = new Date()
const EMPTY_CHART_DATA = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(_now.getTime() - (6 - i) * 86400000).toISOString().slice(0, 10),
  impressions: 0,
  reach: 0,
}))

export function DashboardTab() {
  const [period] = usePeriod()
  void period
  const { hasRealData, reels: realReels, summary } = useInstagramDataContext()

  if (!hasRealData) {
    return (
      <EmptyState
        icon={Camera}
        title="Sin datos de Instagram"
        description="Conectá tu cuenta de Instagram y sincronizá para ver el dashboard con tus métricas reales."
      />
    )
  }

  const snapshot = summary?.latestSnapshot ?? null
  const reelSource = realReels.map(userReelToView)
  const bestReel = [...reelSource].sort((a, b) => b.views - a.views)[0] ?? null
  const totalLikes = reelSource.reduce((sum, r) => sum + r.likes, 0)
  const totalComments = reelSource.reduce((sum, r) => sum + r.comments, 0)
  const followersReal = snapshot?.followers ?? null

  const displayImpressions = snapshot?.impressions ?? 0
  const displayAvgDailyReach = snapshot ? Math.round(snapshot.reach / 30) : 0
  const displayEngagementRate = snapshot?.engagementRate ?? 0
  const displayProfileVisits = snapshot?.profileVisits ?? 0
  const displayNewFollowers = snapshot?.newFollowers ?? 0


  return (
    <div className="space-y-5">
      {/* Row 1 */}
      <div className="grid grid-cols-3 gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="col-span-2" style={{ minHeight: 280 }}>
          <VisitasChart
            data={EMPTY_CHART_DATA}
            impressions={displayImpressions}
            avgDailyReach={displayAvgDailyReach}
            change={0}
          />
        </div>
        <div className="flex flex-col gap-4">
          <StatCard
            label="CONVERSIÓN DE PERFIL"
            value={formatPercent(displayEngagementRate)}
            sub={`${formatK(displayProfileVisits)} visitas → ${formatK(displayNewFollowers)} seguidores`}
            trend="Datos sincronizados"
            trendUp
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="SEGUIDORES"
            value={followersReal !== null ? formatK(followersReal) : '—'}
            sub="Datos sincronizados de Instagram"
            icon={<Users size={16} />}
          />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <DesgloseTrafico organic={50} paid={50} />

        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted-foreground)' }}>INTERACCIONES CLAVE</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <Heart className="h-3 w-3" /> ME GUSTA
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(totalLikes)}</p>
            </div>
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <MessageCircle className="h-3 w-3" /> COMENTARIOS
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(totalComments)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>MEJOR REEL</p>
            <Trophy className="h-5 w-5" style={{ color: 'var(--stat-icon)' }} />
          </div>
          {bestReel ? (
            <>
              <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>1° de {reelSource.length} reels</p>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', minWidth: 56 }}>
                  <Clapperboard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatK(bestReel.views)}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>views totales</p>
                  <Link href={`/instagram/reels/${bestReel.id}`}
                    className="text-xs mt-1 inline-block hover:underline" style={{ color: 'var(--accent)' }}>
                    Ver reel →
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Sin reels sincronizados</p>
          )}
        </div>
      </div>
    </div>
  )
}
