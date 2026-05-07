/**
 * /instagram/reels/[id]
 *
 * Server component: fetches the UserReel row (tenant-scoped) and renders the
 * detail view using only real persisted fields. The richer analytics view
 * (engagement benchmarks, retention curve, best-day chart) is intentionally
 * not implemented — it requires Apify/Instagram Analytics integration that
 * doesn't exist yet.
 */

import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { ReelDetailSimple } from './ReelDetailSimple'

export const dynamic = 'force-dynamic'

export default async function ReelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let clientId: string
  try {
    ;({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect('/login?next=/instagram')
    }
    if (err instanceof ForbiddenError) {
      redirect('/instagram')
    }
    throw err
  }

  const reel = await db.userReel.findFirst({
    where: { id, clientId },
    select: {
      id: true,
      instagramId: true,
      shortcode: true,
      url: true,
      thumbnailUrl: true,
      videoUrl: true,
      caption: true,
      durationSec: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      savesCount: true,
      sharesCount: true,
      reachCount: true,
      impressions: true,
      publishedAt: true,
      syncedAt: true,
    },
  })

  if (!reel) notFound()

  // Serialize Date fields so the client component receives plain JSON.
  return (
    <ReelDetailSimple
      reel={{
        ...reel,
        publishedAt: reel.publishedAt ? reel.publishedAt.toISOString() : null,
        syncedAt: reel.syncedAt.toISOString(),
      }}
    />
  )
}
