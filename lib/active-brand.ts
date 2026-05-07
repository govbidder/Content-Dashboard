import 'server-only'

import { cookies } from 'next/headers'
import { db as prisma } from '@/lib/db'
import { ACTIVE_CLIENT_COOKIE } from '@/lib/auth-user'
import { DEFAULT_THEME_KEY, isValidThemeKey, type ThemeKey } from '@/lib/themes'

export type { ThemeKey } from '@/lib/themes'
export { VALID_THEME_KEYS, DEFAULT_THEME_KEY, isValidThemeKey } from '@/lib/themes'

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
