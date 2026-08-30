import type { SharedMessageCatalog } from './catalogs/types'
import {
  LOCALE_REGISTRY,
  type EnabledLocale,
} from './localeRegistry'

export interface StartupCatalogDiagnostic {
  readonly code: 'selected-locale-catalog-unavailable'
  readonly locale: Exclude<EnabledLocale, 'en'>
}

export interface LoadStartupCatalogOptions {
  readonly loadCatalog?: (
    locale: EnabledLocale,
  ) => Promise<SharedMessageCatalog>
  readonly onDiagnostic?: (
    diagnostic: Readonly<StartupCatalogDiagnostic>,
  ) => void
}

/**
 * Loads the selected startup catalog without mutating locale preference state.
 * A non-English catalog may fail open to bundled English messages; English is
 * the essential fallback and its own failure remains a bootstrap failure.
 */
export async function loadStartupCatalog(
  locale: EnabledLocale,
  options: Readonly<LoadStartupCatalogOptions> = {},
): Promise<SharedMessageCatalog> {
  const loadCatalog = options.loadCatalog ?? ((requested) =>
    LOCALE_REGISTRY[requested].loadSharedCatalog())
  try {
    return await loadCatalog(locale)
  } catch (error) {
    if (locale === 'en') throw error
    reportDiagnostic(options.onDiagnostic, {
      code: 'selected-locale-catalog-unavailable',
      locale,
    })
    return loadCatalog('en')
  }
}

function reportDiagnostic(
  reporter: LoadStartupCatalogOptions['onDiagnostic'],
  diagnostic: Readonly<StartupCatalogDiagnostic>,
): void {
  try {
    reporter?.(Object.freeze(diagnostic))
  } catch {
    // Diagnostic recording is nonessential and cannot block English fallback.
  }
}
