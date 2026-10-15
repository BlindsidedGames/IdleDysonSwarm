import type { IntlShape } from 'react-intl'
import { startupShellMessages } from './messages'

export function formatStartupBoundaryCopy(intl: IntlShape) {
  return Object.freeze({
    title: intl.formatMessage(startupShellMessages.boundaryTitle),
    body: intl.formatMessage(startupShellMessages.boundaryBody),
    diagnosticsSummary: intl.formatMessage(startupShellMessages.diagnosticsSummary),
    diagnosticsLabel: intl.formatMessage(startupShellMessages.diagnosticsLabel),
    reloadAction: intl.formatMessage(startupShellMessages.reloadAction),
    exportRecoveryAction: intl.formatMessage(startupShellMessages.exportRecoveryAction),
    reloadPending: intl.formatMessage(startupShellMessages.reloadPending),
    reloadCompleted: intl.formatMessage(startupShellMessages.reloadCompleted),
    reloadFailed: intl.formatMessage(startupShellMessages.reloadFailed),
    exportPending: intl.formatMessage(startupShellMessages.exportPending),
    exportSucceeded: intl.formatMessage(startupShellMessages.exportSucceeded),
    exportFailed: intl.formatMessage(startupShellMessages.exportFailed),
  })
}
