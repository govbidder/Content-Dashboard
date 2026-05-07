import 'server-only'

import { cookies } from 'next/headers'
import { db as prisma } from '@/lib/db'
import { ACTIVE_CLIENT_COOKIE } from '@/lib/auth-user'

export const VALID_THEME_KEYS = ['eternity', 'govbidder'] as const
export type ThemeKey = (typeof VALID_THEME_KEYS)[number]
export const DEFAULT_THEME_KEY: ThemeKey = 'eternity'

export function isValidThemeKey(key: unknown): key is ThemeKey {
  return typeof key === 'string' && (VALID_THEME_KEYS as readonly string[]).includes(key)
}

export async function getActiveThemeKey(): Promise<ThemeKey> {
  try {
    const cookieStore = await cookies()
    const activeClientId = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value
    if (!activeClientId) return DEFAULT_THEME_KEY

    const client = await prisma.client.findUnique({
      where: { id: activeClientId },
      select: { themeKey: true },
    })
    if (!client) return DEFAULT_THEME_KEY

    return isValidThemeKey(client.themeKey) ? client.themeKey : DEFAULT_THEME_KEY
  } catch {
    return DEFAULT_THEME_KEY
  }
}
