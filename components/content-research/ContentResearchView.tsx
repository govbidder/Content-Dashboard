'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Search,
  Loader2,
  Trash2,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  Eye,
  MessageCircle,
  Telescope,
  Inbox,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { PlatformBadge, type Platform } from '@/components/ui/PlatformBadge'
import { formatK } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/formatDate'
import { toast } from 'sonner'

interface ResearchVideo {
  videoId: string
  title: string
  description: string
  thumbnail: string | null
  videoUrl: string
  views: number
  likes: number
  comments: number
  duration: string
  publishedAt: string | null
  analysis: string | null
}

interface ResearchRow {
  id: string
  platform: Platform
  channelUrl: string
  channelName: string | null
  channelAvatar: string | null
  timeframeDays: number
  videos: ResearchVideo[]
  createdAt: string
}

// `formatK` (lib/utils/formatters) handles 1.5K / 1.5M compaction.
// `formatDate` (lib/utils/formatDate) handles locale + Intl options.
const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

// Instagram CDN URLs embed an `oe` (expiry) param as a hex Unix timestamp.
// Checking it up-front avoids broken-image flickers in history rows.
function isInstagramCdnExpired(url: string | null): boolean {
  if (!url) return false
  if (!url.includes('cdninstagram.com') && !url.includes('fbcdn.net')) return false
  try {
    const oe = new URL(url).searchParams.get('oe')
    if (!oe) return false
    return Date.now() > parseInt(oe, 16) * 1000
  } catch {
    return false
  }
}

function VideoCard({ video, platform, rank }: { video: ResearchVideo; platform: Platform; rank: number }) {
  const [thumbError, setThumbError] = useState(false)
  const showImage = !!video.thumbnail && !thumbError && !isInstagramCdnExpired(video.thumbnail)

  return (
    <div
      className="rounded-xl overflow-hidden card-lift"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="relative aspect-video w-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
        {showImage ? (
          <Image
            src={video.thumbnail!}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover"
            unoptimized
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <PlatformBadge platform={platform} variant="icon" size={28} />
          </div>
        )}
        <span
          className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          #{rank}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          <PlatformBadge platform={platform} variant="icon" size={14} />
          <span className="tabular-nums">{video.duration}</span>
          {video.publishedAt && <span>· {formatDate(video.publishedAt, dateOpts)}</span>}
        </div>
        <h3
          className="text-sm font-semibold leading-snug mb-3 line-clamp-2"
          style={{ color: 'var(--foreground)' }}
        >
          {video.title}
        </h3>

        <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye size={11} /> {formatK(video.views)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <ThumbsUp size={11} /> {formatK(video.likes)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageCircle size={11} /> {formatK(video.comments)}
          </span>
        </div>

        {video.analysis && (
          <div
            className="rounded-lg p-3 mb-3 text-xs leading-relaxed"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
              color: 'var(--foreground)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={11} style={{ color: 'var(--accent)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                Análisis IA
              </span>
            </div>
            {video.analysis}
          </div>
        )}

        <a
          href={video.videoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ExternalLink size={11} /> Ver original
        </a>
      </div>
    </div>
  )
}

function ResearchPanel({ row }: { row: ResearchRow }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <PlatformBadge platform={row.platform} variant="icon" size={14} />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
            {row.channelName ?? row.channelUrl}
          </h3>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Top 5 por vistas · últimos {row.timeframeDays} días · {formatDate(row.createdAt, dateOpts)}
          </p>
        </div>
        <a
          href={row.channelUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ExternalLink size={11} /> abrir canal
        </a>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {row.videos.map((v, i) => (
          <VideoCard key={v.videoId} video={v} platform={row.platform} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

export function ContentResearchView() {
  const [channelUrl, setChannelUrl] = useState('')
  const [timeframe, setTimeframe] = useState<number>(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<ResearchRow | null>(null)
  const [history, setHistory] = useState<ResearchRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<ResearchRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const r = await fetch('/api/content-research')
      const data = await r.json()
      setHistory(data.items ?? [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = channelUrl.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setCurrent(null)
    try {
      const r = await fetch('/api/content-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: trimmed, timeframeDays: timeframe }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'Error en la búsqueda.')
        return
      }
      setCurrent(data as ResearchRow)
      setChannelUrl('')
      void loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    const previous = history
    setDeleting(true)
    setHistory(history.filter((h) => h.id !== id))
    try {
      const r = await fetch('/api/content-research', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) {
        setHistory(previous)
        toast.error('No se pudo eliminar la investigación.')
      } else {
        toast.success('Investigación eliminada.')
      }
    } catch {
      setHistory(previous)
      toast.error('Error de red al eliminar.')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="page-shell" style={{ maxWidth: '76rem' }}>
      <PageHeader
        eyebrow="Contenido"
        title="Content Research"
        description="Pegá un canal de YouTube o un perfil de Instagram. Te traemos sus 5 videos más vistos del periodo y los analizamos con IA."
        icon={Telescope}
      />

      <form
        onSubmit={handleSubmit}
        className="surface-elevated p-4 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[var(--accent)]"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
          >
            <Search size={16} style={{ color: 'var(--muted-foreground)' }} aria-hidden="true" />
            <label htmlFor="research-channel" className="sr-only">
              URL del canal de YouTube o perfil de Instagram
            </label>
            <input
              id="research-channel"
              type="url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://www.youtube.com/@canal  ó  https://instagram.com/usuario"
              required
              disabled={loading}
              aria-describedby={error ? 'research-error' : undefined}
              aria-invalid={error ? true : undefined}
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <label htmlFor="research-timeframe" className="sr-only">
            Periodo de búsqueda
          </label>
          <select
            id="research-timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            disabled={loading}
            className="rounded-xl px-3 py-2.5 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
            <option value={365}>1 año</option>
          </select>
          <button
            type="submit"
            disabled={loading || channelUrl.trim().length === 0}
            aria-busy={loading || undefined}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            style={{
              background: 'var(--gradient-accent)',
              color: 'var(--accent-foreground)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            {loading ? 'Buscando…' : 'Investigar'}
          </button>
        </div>
        {error && (
          <p id="research-error" role="alert" className="mt-3 text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </p>
        )}
      </form>

      {current && (
        <div className="mb-8">
          <ResearchPanel row={current} />
        </div>
      )}

      <Section eyebrow="Historial" flush>
        {historyLoading ? (
          <div role="status" aria-live="polite" aria-label="Cargando historial" className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Cargando…
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aún no investigaste ningún canal"
            description="Pegá una URL arriba y guardamos los resultados acá para que vuelvas cuando quieras."
          />
        ) : (
          <div className="grid gap-4">
            {history.map((row) => (
              <div key={row.id} className="relative">
                <ResearchPanel row={row} />
                <button
                  type="button"
                  onClick={() => setPendingDelete(row)}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:opacity-70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label={`Eliminar investigación de ${row.channelName ?? row.channelUrl}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {pendingDelete && (
        <ConfirmDeleteModal
          title="Eliminar investigación"
          description={
            <>
              Vas a eliminar permanentemente la investigación de{' '}
              <strong>&ldquo;{pendingDelete.channelName ?? pendingDelete.channelUrl}&rdquo;</strong>{' '}
              y los {pendingDelete.videos.length} videos analizados. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
          busy={deleting}
          icon={<Trash2 size={12} />}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
