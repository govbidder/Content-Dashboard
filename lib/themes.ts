export const VALID_THEME_KEYS = ['eternity', 'govbidder'] as const
export type ThemeKey = (typeof VALID_THEME_KEYS)[number]
export const DEFAULT_THEME_KEY: ThemeKey = 'eternity'

export function isValidThemeKey(key: unknown): key is ThemeKey {
  return typeof key === 'string' && (VALID_THEME_KEYS as readonly string[]).includes(key)
}
