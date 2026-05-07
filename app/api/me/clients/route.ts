/**
 * GET /api/me/clients — list clients the current user has access to.
 *
 * SUPER_ADMIN sees every client. Everyone else sees only their ClientAccess.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireProfile, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  try {
    const { userId, globalRole } = await requireProfile()
    if (globalRole === 'PENDING') {
      return NextResponse.json({ clients: [] })
    }
    let clients: { id: string; name: string; slug: string; themeKey: string }[]
    if (globalRole === 'SUPER_ADMIN') {
      clients = await db.client.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, slug: true, themeKey: true },
      })
    } else {
      const rows = await db.clientAccess.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: { client: { select: { id: true, name: true, slug: true, themeKey: true } } },
      })
      clients = rows.map((r) => r.client)
    }
    return NextResponse.json({ clients })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/clients/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
