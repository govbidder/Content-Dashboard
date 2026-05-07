import { isValidThemeKey, VALID_THEME_KEYS, DEFAULT_THEME_KEY } from '@/lib/themes'

describe('themes', () => {
  describe('VALID_THEME_KEYS', () => {
    it('includes eternity and govbidder', () => {
      expect(VALID_THEME_KEYS).toContain('eternity')
      expect(VALID_THEME_KEYS).toContain('govbidder')
    })
  })

  describe('DEFAULT_THEME_KEY', () => {
    it('is a valid theme key', () => {
      expect(VALID_THEME_KEYS).toContain(DEFAULT_THEME_KEY)
    })
  })

  describe('isValidThemeKey', () => {
    it.each(VALID_THEME_KEYS)('accepts %s', (key) => {
      expect(isValidThemeKey(key)).toBe(true)
    })

    it('rejects unknown strings', () => {
      expect(isValidThemeKey('not-a-theme')).toBe(false)
      expect(isValidThemeKey('ETERNITY')).toBe(false)
      expect(isValidThemeKey('')).toBe(false)
    })

    it('rejects non-string values', () => {
      expect(isValidThemeKey(undefined)).toBe(false)
      expect(isValidThemeKey(null)).toBe(false)
      expect(isValidThemeKey(42)).toBe(false)
      expect(isValidThemeKey({})).toBe(false)
      expect(isValidThemeKey(['eternity'])).toBe(false)
    })
  })
})
