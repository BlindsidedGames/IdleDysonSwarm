import { createIntl, createIntlCache } from 'react-intl'
import { describe, expect, it } from 'vitest'
import arXbCatalog from './catalogs/compiled/ar-XB.json'
import enCatalog from './catalogs/compiled/en.json'
import enXaCatalog from './catalogs/compiled/en-XA.json'
import sourceCatalog from './catalogs/source/en.json'
import {
  ENABLED_LOCALES,
  LOCALE_REGISTRY,
  loadDestinationCatalog,
} from './localeRegistry'
import { sharedMessages } from './messages'
import { startupShellMessages } from '../shell/messages'

describe('compiled locale catalogs', () => {
  it('keeps every enabled catalog complete and free of orphaned keys', () => {
    const expected = [
      ...Object.values(sharedMessages),
      ...Object.values(startupShellMessages),
    ]
      .map((descriptor) => descriptor.id)
      .sort()
    expect(Object.keys(sourceCatalog).sort()).toEqual(expected)
    expect(Object.keys(enCatalog).sort()).toEqual(expected)
    expect(Object.keys(enXaCatalog).sort()).toEqual(expected)
    expect(Object.keys(arXbCatalog).sort()).toEqual(expected)

    for (const descriptor of Object.values(sourceCatalog)) {
      expect(descriptor.defaultMessage.length).toBeGreaterThan(0)
      expect(descriptor.description.length).toBeGreaterThan(0)
    }
    const loading =
      sourceCatalog['shared.status.loading'].defaultMessage
    expect(loading.codePointAt(loading.length - 1)).toBe(0x2026)
  })

  it('expands and accents the LTR pseudo-locale without changing ICU arguments', () => {
    const source = literalText(enCatalog['shared.locale.changed'])
    const pseudo = literalText(enXaCatalog['shared.locale.changed'])
    expect(pseudo.length).toBeGreaterThan(source.length * 1.25)
    expect(pseudo).not.toContain('Language changed')
    expect(
      argumentNames(enXaCatalog['shared.locale.changed']),
    ).toEqual(['languageName'])
  })

  it('mirrors the RTL pseudo-locale while preserving ICU plural structure', () => {
    const mirrored = literalText(arXbCatalog['shared.action.dismiss'])
    expect(mirrored.codePointAt(0)).toBe(0x202e)
    expect(mirrored.codePointAt(mirrored.length - 1)).toBe(0x202c)
    expect(mirrored).not.toContain('Dismiss')

    const owned = arXbCatalog['shared.facility.owned-count']
    expect(findElement(owned, 6)).toMatchObject({
      value: 'count',
      pluralType: 'cardinal',
    })
  })

  it('formats compiled ICU catalogs without runtime message parsing errors', () => {
    const intl = createIntl(
      {
        locale: 'en',
        messages: enCatalog,
      },
      createIntlCache(),
    )
    expect(
      intl.formatMessage(sharedMessages.ownedCount, { count: 2 }),
    ).toBe('2 owned')
  })
})

describe('typed locale registry', () => {
  it('enables only English and the two required pseudo-locales', () => {
    expect(ENABLED_LOCALES).toEqual(['en', 'en-XA', 'ar-XB'])
    expect(Object.keys(LOCALE_REGISTRY)).toEqual(ENABLED_LOCALES)
    expect(LOCALE_REGISTRY.en.productionSelectable).toBe(true)
    expect(LOCALE_REGISTRY['en-XA'].productionSelectable).toBe(false)
    expect(LOCALE_REGISTRY['ar-XB']).toMatchObject({
      languageTag: 'ar-XB',
      direction: 'rtl',
      fontFamily: 'latin',
      productionSelectable: false,
    })
  })

  it('loads shared catalogs lazily and leaves unavailable destinations absent', async () => {
    await expect(
      LOCALE_REGISTRY['en-XA'].loadSharedCatalog(),
    ).resolves.toHaveProperty('shared.status.ready')
    await expect(
      loadDestinationCatalog('en', 'dyson'),
    ).resolves.toBeNull()
  })
})

interface AstElement {
  readonly type?: number
  readonly value?: string
  readonly options?: Readonly<
    Record<string, { readonly value?: readonly AstElement[] }>
  >
  readonly children?: readonly AstElement[]
}

function literalText(ast: readonly AstElement[]): string {
  return ast
    .flatMap((element) => [
      element.type === 0 ? element.value ?? '' : '',
      ...Object.values(element.options ?? {}).map((option) =>
        literalText(option.value ?? []),
      ),
      literalText(element.children ?? []),
    ])
    .join('')
}

function argumentNames(ast: readonly AstElement[]): string[] {
  return ast
    .flatMap((element) => [
      element.type === 1 ? element.value ?? '' : '',
      ...Object.values(element.options ?? {}).flatMap((option) =>
        argumentNames(option.value ?? []),
      ),
      ...argumentNames(element.children ?? []),
    ])
    .filter(Boolean)
}

function findElement(
  ast: readonly AstElement[],
  type: number,
): AstElement | undefined {
  for (const element of ast) {
    if (element.type === type) return element
    for (const option of Object.values(element.options ?? {})) {
      const found = findElement(option.value ?? [], type)
      if (found) return found
    }
    const child = findElement(element.children ?? [], type)
    if (child) return child
  }
  return undefined
}
