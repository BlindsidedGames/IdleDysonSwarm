import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { FormattedMessage, IntlProvider } from 'react-intl'
import type { SharedMessageCatalog } from './catalogs/types'
import {
  LOCALE_REGISTRY,
  type EnabledLocale,
} from './localeRegistry'
import {
  LocalePreferenceService,
} from './localePreference'
import { PresentationIntlProvider } from './PresentationIntlProvider'
import { sharedMessages } from './messages'
import {
  LocalePreferenceContext,
  type LocalePreferenceContextValue,
} from './localeContext'

export function LocalePreferenceProvider({
  preference,
  initialLocale,
  initialMessages,
  children,
  onError,
}: {
  readonly preference: LocalePreferenceService
  readonly initialLocale: EnabledLocale
  readonly initialMessages: SharedMessageCatalog
  readonly children: ReactNode
  readonly onError?: ComponentProps<typeof IntlProvider>['onError']
}) {
  const snapshot = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    preference.getSnapshot,
  )
  const [catalog, setCatalog] = useState(() => ({
    locale: initialLocale,
    requestedLocale: snapshot.locale,
    messages: initialMessages,
  }))
  const [announcedLocale, setAnnouncedLocale] =
    useState<EnabledLocale | null>(null)

  useEffect(() => {
    if (catalog.requestedLocale === snapshot.locale) return undefined
    let active = true
    void LOCALE_REGISTRY[snapshot.locale]
      .loadSharedCatalog()
      .then((messages) => {
        if (active) {
          setCatalog({
            locale: snapshot.locale,
            requestedLocale: snapshot.locale,
            messages,
          })
          setAnnouncedLocale(snapshot.locale)
        }
      })
    return () => {
      active = false
    }
  }, [catalog.requestedLocale, snapshot.locale])

  useEffect(() => {
    preference.applyEffectiveLocale(catalog.locale)
  }, [catalog.locale, preference])

  useEffect(() => {
    const refresh = () => preference.refreshPreferredLocales()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('languagechange', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('languagechange', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [preference])

  const value = useMemo<LocalePreferenceContextValue>(() => ({
    locale: catalog.locale,
    preference: snapshot.preference,
    setPreference: (next) => {
      preference.setPreference(next)
    },
  }), [catalog.locale, preference, snapshot.preference])

  return (
    <LocalePreferenceContext.Provider value={value}>
      <PresentationIntlProvider
        locale={catalog.locale}
        messages={catalog.messages}
        onError={onError}
      >
        {children}
        {announcedLocale === null ? null : (
          <span
            className="ui-visually-hidden"
            role="status"
            aria-live="polite"
          >
            <FormattedMessage
              {...sharedMessages.localeChanged}
              values={{
                languageName: languageName(announcedLocale),
              }}
            />
          </span>
        )}
      </PresentationIntlProvider>
    </LocalePreferenceContext.Provider>
  )
}

function languageName(locale: EnabledLocale): string {
  return {
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    'es-419': 'Español (Latinoamérica)',
    'pt-BR': 'Português (Brasil)',
    'zh-CN': '简体中文',
    ru: 'Русский',
    ja: '日本語',
    'en-XA': 'Expanded English',
    'ar-XB': 'Mirrored Arabic',
  }[locale]
}
