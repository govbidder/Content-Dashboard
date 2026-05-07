/**
 * GET /api/me/global-stats — aggregate stats for the active client.
 *
 * Reads the latest AccountSnapshot per platform and sums followers + views
 * across them. Returns `null` (or a 404 body) when there's no data — the
 * UI shows "—" placeholders instead of fake numbers.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  try {
    const { clientId } = await requireActiveClient()

    const platforms = await db.accountSnapshot.findMany({
      where: { clientId },
      orderBy: [{ platform: 'asc' }, { date: 'desc' }],
    })

    if (platforms.length === 0) {
      return NextResponse.json(null)
    }

    const latestPerPlatform = new Map<string, (typeof platforms)[number]>()
    for (const snap of platforms) {
      if (!latestPerPlatform.has(snap.platform)) {
        latestPerPlatform.set(snap.platform, snap)
      }
    }

    const snaps = Array.from(latestPerPlatform.values())
    const followers = snaps.reduce((sum, s) => sum + s.followers, 0)
    const views = snaps.reduce((sum, s) => sum + s.impressions, 0)
    const engagementRate =
      snaps.length > 0
        ? snaps.reduce((sum, s) => sum + s.engagementRate, 0) / snaps.length
        : 0

    return NextResponse.json({ followers, views, engagementRate })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/global-stats/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
