import { LOCALE_REGISTRY, type EnabledLocale } from './localeRegistry'
import type { CompiledMessage } from './catalogs/types'

/** Classic keeps its historical catalog. Only shared mode chrome is overlaid
 * from the maintained localization pipeline, including live locale changes. */
export async function mergeModeChromeCatalog(locale: EnabledLocale, base: Readonly<Record<string, CompiledMessage>>) {
  const shared = await LOCALE_REGISTRY[locale].loadSharedCatalog()
  return { ...base, ...Object.fromEntries(Object.entries(shared).filter(([id]) => id.startsWith('modes.'))) }
}
