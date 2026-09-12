import type { SharedMessageCatalog } from './catalogs/types'

export const ENABLED_LOCALES = [
  'en',
  'fr',
  'de',
  'es-419',
  'pt-BR',
  'zh-CN',
  'ru',
  'ja',
  'en-XA',
  'ar-XB',
] as const
export const PRODUCTION_LOCALES = [
  'en',
  'fr',
  'de',
  'es-419',
  'pt-BR',
  'zh-CN',
  'ru',
  'ja',
] as const
export type EnabledLocale = (typeof ENABLED_LOCALES)[number]
export type TextDirection = 'ltr' | 'rtl'

export interface LocaleDefinition {
  readonly id: EnabledLocale
  readonly languageTag: string
  readonly direction: TextDirection
  readonly fontFamily: 'latin' | 'cjk'
  readonly productionSelectable: boolean
  readonly loadSharedCatalog: () => Promise<SharedMessageCatalog>
}

async function loadCompiledSharedCatalog(
  locale: EnabledLocale,
): Promise<SharedMessageCatalog> {
  const module = await {
    en: () => import('./catalogs/compiled/en.json'),
    fr: () => import('./catalogs/compiled/fr.json'),
    de: () => import('./catalogs/compiled/de.json'),
    'es-419': () => import('./catalogs/compiled/es-419.json'),
    'pt-BR': () => import('./catalogs/compiled/pt-BR.json'),
    'zh-CN': () => import('./catalogs/compiled/zh-CN.json'),
    ru: () => import('./catalogs/compiled/ru.json'),
    ja: () => import('./catalogs/compiled/ja.json'),
    'en-XA': () => import('./catalogs/compiled/en-XA.json'),
    'ar-XB': () => import('./catalogs/compiled/ar-XB.json'),
  }[locale]()
  return module.default as SharedMessageCatalog
}

export const LOCALE_REGISTRY = Object.freeze({
  en: Object.freeze({
    id: 'en',
    languageTag: 'en',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('en'),
  }),
  fr: Object.freeze({
    id: 'fr',
    languageTag: 'fr',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('fr'),
  }),
  de: Object.freeze({
    id: 'de',
    languageTag: 'de',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('de'),
  }),
  'es-419': Object.freeze({
    id: 'es-419',
    languageTag: 'es-419',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('es-419'),
  }),
  'pt-BR': Object.freeze({
    id: 'pt-BR',
    languageTag: 'pt-BR',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('pt-BR'),
  }),
  'zh-CN': Object.freeze({
    id: 'zh-CN',
    languageTag: 'zh-Hans',
    direction: 'ltr',
    fontFamily: 'cjk',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('zh-CN'),
  }),
  ru: Object.freeze({
    id: 'ru',
    languageTag: 'ru',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('ru'),
  }),
  ja: Object.freeze({
    id: 'ja',
    languageTag: 'ja',
    direction: 'ltr',
    fontFamily: 'cjk',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('ja'),
  }),
  'en-XA': Object.freeze({
    id: 'en-XA',
    languageTag: 'en-XA',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: false,
    loadSharedCatalog: () => loadCompiledSharedCatalog('en-XA'),
  }),
  'ar-XB': Object.freeze({
    id: 'ar-XB',
    languageTag: 'ar-XB',
    direction: 'rtl',
    fontFamily: 'latin',
    productionSelectable: false,
    loadSharedCatalog: () => loadCompiledSharedCatalog('ar-XB'),
  }),
} as const satisfies Record<EnabledLocale, LocaleDefinition>)

export function isEnabledLocale(value: string): value is EnabledLocale {
  return Object.prototype.hasOwnProperty.call(LOCALE_REGISTRY, value)
}

export function resolveLocale(value: string | null | undefined): EnabledLocale {
  if (!value) return 'en'
  let canonical: string
  try {
    canonical = Intl.getCanonicalLocales(value)[0] ?? ''
  } catch {
    return 'en'
  }
  return resolveCanonicalLocale(canonical) ?? 'en'
}

export function resolvePreferredLocale(
  requestedLocales: readonly string[],
): EnabledLocale {
  for (const requested of requestedLocales) {
    const canonical = canonicalLocale(requested)
    if (canonical === null) continue
    const resolved = resolveCanonicalLocale(canonical)
    if (resolved !== null) return resolved
  }
  return 'en'
}

function resolveCanonicalLocale(canonical: string): EnabledLocale | null {
  if (isEnabledLocale(canonical)) return canonical
  if (canonical === 'fr' || canonical.startsWith('fr-')) return 'fr'
  if (canonical === 'de' || canonical.startsWith('de-')) return 'de'
  if (canonical === 'es' || canonical.startsWith('es-')) return 'es-419'
  if (canonical === 'pt' || canonical.startsWith('pt-')) return 'pt-BR'
  if (isSimplifiedChinese(canonical)) return 'zh-CN'
  if (canonical === 'ru' || canonical.startsWith('ru-')) return 'ru'
  if (canonical === 'ja' || canonical.startsWith('ja-')) return 'ja'
  if (canonical === 'en' || canonical.startsWith('en-')) return 'en'
  return null
}

function isSimplifiedChinese(locale: string): boolean {
  return locale === 'zh-CN' || locale === 'zh-SG' ||
    locale === 'zh-Hans' || locale.startsWith('zh-Hans-')
}

function canonicalLocale(value: string): string | null {
  try {
    return Intl.getCanonicalLocales(value)[0] ?? null
  } catch {
    return null
  }
}
