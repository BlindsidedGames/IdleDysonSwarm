import type {
  DestinationCatalogLoader,
  DestinationMessageCatalog,
  DestinationId,
  SharedMessageCatalog,
} from './catalogs/types'

export const ENABLED_LOCALES = ['en', 'en-XA', 'ar-XB'] as const
export type EnabledLocale = (typeof ENABLED_LOCALES)[number]
export type TextDirection = 'ltr' | 'rtl'

export interface LocaleDefinition {
  readonly id: EnabledLocale
  readonly languageTag: EnabledLocale
  readonly direction: TextDirection
  readonly fontFamily: 'latin'
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
  return canonical === 'en' || canonical.startsWith('en-') ? 'en' : 'en'
}

export function resolvePreferredLocale(
  requestedLocales: readonly string[],
): EnabledLocale {
  for (const requested of requestedLocales) {
    const canonical = canonicalLocale(requested)
    if (canonical && isEnabledLocale(canonical)) return canonical
  }
  for (const requested of requestedLocales) {
    const canonical = canonicalLocale(requested)
    if (canonical === 'en' || canonical?.startsWith('en-')) return 'en'
  }
  return 'en'
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
