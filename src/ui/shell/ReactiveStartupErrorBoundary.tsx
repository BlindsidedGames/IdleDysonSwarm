import type { ReactNode } from 'react'
import { useIntl } from 'react-intl'
import { useLocalePreference } from '../i18n'
import { formatStartupBoundaryCopy } from './startupBoundaryCopy'
import {
  StartupErrorBoundary,
  type StartupErrorBoundaryActions,
  type StartupErrorBoundaryProps,
} from './StartupErrorBoundary'

export function ReactiveStartupErrorBoundary({
  actions,
  diagnosticContext,
  children,
}: {
  readonly actions: StartupErrorBoundaryActions
  readonly diagnosticContext: Omit<
    NonNullable<StartupErrorBoundaryProps['diagnosticContext']>,
    'locale'
  >
  readonly children: ReactNode
}) {
  const intl = useIntl()
  const { locale } = useLocalePreference()
  return (
    <StartupErrorBoundary
      copy={formatStartupBoundaryCopy(intl)}
      actions={actions}
      diagnosticContext={{ ...diagnosticContext, locale }}
    >
      {children}
    </StartupErrorBoundary>
  )
}
