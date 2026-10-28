import { describe, expect, test } from 'vitest'
import {
  resolveLocale,
  resolvePreferredLocale,
} from './localeRegistry'

describe('locale resolution', () => {
  test.each([
    [null, 'en'],
    ['', 'en'],
    ['not_a_locale', 'en'],
    ['fr-CA', 'fr'],
    ['de-AT', 'de'],
    ['es-ES', 'es-419'],
    ['pt-PT', 'pt-BR'],
    ['zh-SG', 'zh-CN'],
    ['zh-Hans-CN', 'zh-CN'],
    ['zh-TW', 'en'],
    ['ru-RU', 'ru'],
    ['ja-JP', 'ja'],
    ['en-XA', 'en-XA'],
    ['ar-XB', 'ar-XB'],
  ] as const)('resolves %s to %s', (requested, expected) => {
    expect(resolveLocale(requested)).toBe(expected)
  })

  test.each([
    [[], 'en'],
    [['not_a_locale', 'de-CH', 'fr-CA'], 'de'],
    [['zh-TW', 'ja-JP'], 'ja'],
    [['en-AU', 'fr-CA'], 'en'],
    [['ar-XB', 'en'], 'ar-XB'],
  ] as const)(
    'selects the first supported locale from %j',
    (requested, expected) => {
      expect(resolvePreferredLocale(requested)).toBe(expected)
    },
  )
})
