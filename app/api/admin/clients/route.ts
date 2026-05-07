/**
 * GET  /api/admin/clients — list all clients with access counts.
 * POST /api/admin/clients — create a new client.
 * SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { CreateClientSchema, slugify } from '@/lib/schemas/admin'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-clients', 60, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const clients = await db.client.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { accesses: true } } },
    })
    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        themeKey: c.themeKey,
        createdAt: c.createdAt,
        accessCount: c._count.accesses,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/clients/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-client-create', 20, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = CreateClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { name, themeKey } = parsed.data
  const slug = parsed.data.slug ?? slugify(name)
  if (!slug) {
    return NextResponse.json({ error: 'Could not derive slug from name' }, { status: 400 })
  }

  try {
    const client = await db.client.create({
      data: { name, slug, ...(themeKey ? { themeKey } : {}) },
    })
    return NextResponse.json({ client }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/clients/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
