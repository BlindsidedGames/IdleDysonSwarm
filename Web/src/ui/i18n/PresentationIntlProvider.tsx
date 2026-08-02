import type { ComponentProps, ReactNode } from 'react'
import {
  IntlProvider,
  type IntlShape,
} from 'react-intl'
import type { SharedMessageCatalog } from './catalogs/types'
import {
  LOCALE_REGISTRY,
  type EnabledLocale,
} from './localeRegistry'

export interface PresentationIntlProviderProps {
  readonly locale: EnabledLocale
  readonly messages: SharedMessageCatalog
  readonly children: ReactNode
  readonly onError?: ComponentProps<typeof IntlProvider>['onError']
}

export function PresentationIntlProvider({
  locale,
  messages,
  children,
  onError,
}: PresentationIntlProviderProps) {
  const definition = LOCALE_REGISTRY[locale]
  return (
    <IntlProvider
      locale={definition.languageTag}
      defaultLocale="en"
      messages={messages as IntlShape['messages']}
      onError={onError}
    >
      {children}
    </IntlProvider>
  )
}
