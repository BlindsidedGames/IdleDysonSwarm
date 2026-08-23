import type {
  DestinationCatalogLoader,
  DestinationMessageCatalog,
  DestinationId,
  SharedMessageCatalog,
} from './catalogs/types'

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
  readonly destinationCatalogs: Readonly<
    Partial<Record<DestinationId, DestinationCatalogLoader>>
  >
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

const noDestinationCatalogs: Readonly<
  Partial<Record<DestinationId, DestinationCatalogLoader>>
> = Object.freeze({})

export const LOCALE_REGISTRY = Object.freeze({
  en: Object.freeze({
    id: 'en',
    languageTag: 'en',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('en'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  fr: Object.freeze({
    id: 'fr',
    languageTag: 'fr',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('fr'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  de: Object.freeze({
    id: 'de',
    languageTag: 'de',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('de'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  'es-419': Object.freeze({
    id: 'es-419',
    languageTag: 'es-419',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('es-419'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  'pt-BR': Object.freeze({
    id: 'pt-BR',
    languageTag: 'pt-BR',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('pt-BR'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  'zh-CN': Object.freeze({
    id: 'zh-CN',
    languageTag: 'zh-Hans',
    direction: 'ltr',
    fontFamily: 'cjk',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('zh-CN'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  ru: Object.freeze({
    id: 'ru',
    languageTag: 'ru',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('ru'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  ja: Object.freeze({
    id: 'ja',
    languageTag: 'ja',
    direction: 'ltr',
    fontFamily: 'cjk',
    productionSelectable: true,
    loadSharedCatalog: () => loadCompiledSharedCatalog('ja'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  'en-XA': Object.freeze({
    id: 'en-XA',
    languageTag: 'en-XA',
    direction: 'ltr',
    fontFamily: 'latin',
    productionSelectable: false,
    loadSharedCatalog: () => loadCompiledSharedCatalog('en-XA'),
    destinationCatalogs: noDestinationCatalogs,
  }),
  'ar-XB': Object.freeze({
    id: 'ar-XB',
    languageTag: 'ar-XB',
    direction: 'rtl',
    fontFamily: 'latin',
    productionSelectable: false,
    loadSharedCatalog: () => loadCompiledSharedCatalog('ar-XB'),
    destinationCatalogs: noDestinationCatalogs,
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
  if (isEnabledLocale(canonical)) return canonical
  if (canonical === 'fr' || canonical.startsWith('fr-')) return 'fr'
  if (canonical === 'de' || canonical.startsWith('de-')) return 'de'
  if (canonical === 'es' || canonical.startsWith('es-')) return 'es-419'
  if (canonical === 'pt' || canonical.startsWith('pt-')) return 'pt-BR'
  if (isSimplifiedChinese(canonical)) return 'zh-CN'
  if (canonical === 'ru' || canonical.startsWith('ru-')) return 'ru'
  if (canonical === 'ja' || canonical.startsWith('ja-')) return 'ja'
  return 'en'
}

export function resolvePreferredLocale(
  requestedLocales: readonly string[],
): EnabledLocale {
  for (const requested of requestedLocales) {
    const canonical = canonicalLocale(requested)
    if (canonical && isEnabledLocale(canonical)) return canonical
    if (canonical === 'fr' || canonical?.startsWith('fr-')) return 'fr'
    if (canonical === 'de' || canonical?.startsWith('de-')) return 'de'
    if (canonical === 'es' || canonical?.startsWith('es-')) return 'es-419'
    if (canonical === 'pt' || canonical?.startsWith('pt-')) return 'pt-BR'
    if (canonical && isSimplifiedChinese(canonical)) return 'zh-CN'
    if (canonical === 'ru' || canonical?.startsWith('ru-')) return 'ru'
    if (canonical === 'ja' || canonical?.startsWith('ja-')) return 'ja'
    if (canonical === 'en' || canonical?.startsWith('en-')) return 'en'
  }
  return 'en'
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

export async function loadDestinationCatalog(
  locale: EnabledLocale,
  destination: DestinationId,
): Promise<DestinationMessageCatalog | null> {
  const loader = LOCALE_REGISTRY[locale].destinationCatalogs[destination]
  return loader ? loader() : null
}
