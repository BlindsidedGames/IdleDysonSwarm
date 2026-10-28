import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createIntl, createIntlCache, type IntlShape } from 'react-intl'
import { describe, expect, test } from 'vitest'
import { ENABLED_LOCALES, LOCALE_REGISTRY, type EnabledLocale } from '../src/ui/i18n/localeRegistry'
import { loadStartupCatalog } from '../src/ui/i18n/startupCatalog'
import type { SharedMessageCatalog } from '../src/ui/i18n/catalogs/types'
import { collectWikiAuthoredMessages } from './wikiAuthoredMessages'
import {
  omitDuplicatedEnglishWikiMessages,
  omitDuplicatedEnglishWikiMessagesPlugin,
} from './omitDuplicatedEnglishWikiMessages'

const root = resolve(import.meta.dirname, '..')
const source = JSON.parse(readFileSync(resolve(root, 'src/ui/i18n/catalogs/source/en.json'), 'utf8'))
const catalogs = Object.fromEntries(ENABLED_LOCALES.map(locale => [locale,
  JSON.parse(readFileSync(resolve(root, `src/ui/i18n/catalogs/compiled/${locale}.json`), 'utf8')),
])) as Record<EnabledLocale, Record<string, unknown>>
const authored = collectWikiAuthoredMessages()
const english = omitDuplicatedEnglishWikiMessages(catalogs.en, source)

function formatted(locale: EnabledLocale, messages: Record<string, unknown>) {
  const errors: string[] = []
  const intl = createIntl({
    locale: LOCALE_REGISTRY[locale].languageTag,
    defaultLocale: 'en',
    messages: messages as IntlShape['messages'],
    onError: error => errors.push(String(error)),
  }, createIntlCache())
  return { text: authored.map(descriptor => intl.formatMessage(descriptor)), errors }
}

function withoutAuthored(messages: Record<string, unknown>) {
  const ids = new Set(authored.map(descriptor => descriptor.id))
  return Object.fromEntries(Object.entries(messages).filter(([id]) => !ids.has(id)))
}

describe('English authored Wiki catalog deduplication', () => {
  test('removes only exact runtime-authored entries without mutating authoring inputs', () => {
    expect(authored).toHaveLength(43)
    expect(Object.keys(english)).toHaveLength(Object.keys(catalogs.en).length - authored.length)
    for (const descriptor of authored) {
      expect(Object.hasOwn(english, descriptor.id)).toBe(false)
      expect(Object.hasOwn(catalogs.en, descriptor.id)).toBe(true)
    }
    expect(english['wiki.lore.title']).toEqual(catalogs.en['wiki.lore.title'])
    expect(english['wiki.lore.introduction']).toEqual(catalogs.en['wiki.lore.introduction'])
    expect(english['skills.node.androids.technical']).toEqual(catalogs.en['skills.node.androids.technical'])
  })

  test.each(ENABLED_LOCALES)('preserves %s formatting and missing-ID error paths', locale => {
    const original = catalogs[locale]
    const candidate = locale === 'en' ? english : original
    expect(formatted(locale, candidate)).toEqual(formatted(locale, original))
    expect(formatted(locale, candidate).errors).toEqual([])
    const originalMissing = formatted(locale, withoutAuthored(original))
    expect(formatted(locale, withoutAuthored(candidate))).toEqual(originalMissing)
    expect(originalMissing.errors).toHaveLength(locale === 'en' ? 0 : authored.length)
  })

  test.each(ENABLED_LOCALES.filter(locale => locale !== 'en'))(
    'preserves selected %s startup failure and effective English fallback', async locale => {
      const run = async (englishMessages: Record<string, unknown>) => {
        const diagnostics: unknown[] = []
        const result = await loadStartupCatalog(locale, {
          loadCatalog: async requested => {
            if (requested !== 'en') throw new Error('selected catalog unavailable')
            return englishMessages as SharedMessageCatalog
          },
          onDiagnostic: diagnostic => diagnostics.push(diagnostic),
        })
        return { locale: result.locale, formatted: formatted(result.locale, result.messages), diagnostics }
      }
      expect(await run(english)).toEqual(await run(catalogs.en))
    },
  )

  test('fails closed for stale source, changed text or structured compiled messages', () => {
    const descriptor = authored[0]
    expect(() => omitDuplicatedEnglishWikiMessages(catalogs.en, {
      ...source,
      [descriptor.id]: { ...source[descriptor.id], defaultMessage: 'stale' },
    })).toThrow(`Authored Wiki source descriptor changed: ${descriptor.id}`)
    expect(() => omitDuplicatedEnglishWikiMessages({
      ...catalogs.en,
      [descriptor.id]: [{ type: 0, value: 'stale' }],
    }, source)).toThrow(`Authored Wiki compiled message changed: ${descriptor.id}`)
    const missing = { ...catalogs.en }
    delete missing[descriptor.id]
    expect(() => omitDuplicatedEnglishWikiMessages(missing, source)).toThrow('compiled message changed')
    expect(() => omitDuplicatedEnglishWikiMessages({
      ...catalogs.en,
      [descriptor.id]: [{ type: 1, value: descriptor.defaultMessage }],
    }, source)).toThrow(`Authored Wiki compiled message changed: ${descriptor.id}`)
  })

  test('transforms only the exact build-time English compiled module', async () => {
    const plugin = omitDuplicatedEnglishWikiMessagesPlugin()
    expect(plugin.apply).toBe('build')
    expect(plugin.enforce).toBe('pre')
    if (typeof plugin.configResolved !== 'function' || typeof plugin.transform !== 'function') {
      throw new Error('Expected direct plugin hooks')
    }
    await Reflect.apply(plugin.configResolved, {}, [{ root }])
    for (const locale of ENABLED_LOCALES.filter(locale => locale !== 'en')) {
      expect(await Reflect.apply(plugin.transform, {}, [JSON.stringify(catalogs[locale]), resolve(root, `src/ui/i18n/catalogs/compiled/${locale}.json`)])).toBeNull()
    }
    expect(await Reflect.apply(plugin.transform, {}, ['unchanged', resolve(root, 'src/ui/gameplay/wiki/content.ts')])).toBeNull()
    expect(await Reflect.apply(plugin.transform, {}, ['unchanged', resolve(root, 'src/ui/i18n/catalogs/source/en.json')])).toBeNull()
    const transformed = await Reflect.apply(plugin.transform, {}, [JSON.stringify(catalogs.en), resolve(root, 'src/ui/i18n/catalogs/compiled/en.json')])
    expect(JSON.parse(transformed.code)).toEqual(english)
  })
})
