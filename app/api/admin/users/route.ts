/**
 * GET  /api/admin/users — list all users (Profile + auth.users join). SUPER_ADMIN only.
 * POST /api/admin/users — create a new auth user + Profile. SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { CreateUserSchema } from '@/lib/schemas/admin'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-users', 60, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    // Pull every Profile + its access rows; decorate with auth.users email
    // (Profile.email is cached but may lag behind).
    const profiles = await db.profile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        clientAccess: {
          include: { client: { select: { id: true, name: true, slug: true } } },
        },
      },
    })

    let authEmailById = new Map<string, string | undefined>()
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (!error && data) {
        authEmailById = new Map(data.users.map((u) => [u.id, u.email ?? undefined]))
      }
    } catch (err) {
      console.warn('[admin/users] auth.users lookup failed:', err)
    }

    const users = profiles.map((p) => ({
      id: p.id,
      email: authEmailById.get(p.id) ?? p.email ?? null,
      displayName: p.displayName,
      globalRole: p.globalRole,
      createdAt: p.createdAt,
      clientAccess: p.clientAccess.map((a) => ({
        clientId: a.clientId,
        clientName: a.client.name,
        clientSlug: a.client.slug,
      })),
    }))

    return NextResponse.json({ users })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/users/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-create-user', 10, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, displayName, globalRole, clientId } = parsed.data

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Error al crear usuario en Supabase' }, { status: 400 })
    }

    const userId = data.user.id

    await db.profile.upsert({
      where: { id: userId },
      create: { id: userId, email, displayName: displayName ?? null, globalRole },
      update: { displayName: displayName ?? undefined, globalRole },
    })

    if (clientId) {
      await db.clientAccess.upsert({
        where: { userId_clientId: { userId, clientId } },
        create: { userId, clientId },
        update: {},
      })
    }

    return NextResponse.json({ id: userId }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/users/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
