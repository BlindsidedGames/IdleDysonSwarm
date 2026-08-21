import { useIntl } from 'react-intl'
import { startupShellMessages } from './messages'
import {
  formatLocalDiagnosticReport,
  type LocalDiagnosticReport,
} from './diagnostics'

export interface LocalDiagnosticsProps {
  readonly report: LocalDiagnosticReport
}

export function LocalDiagnostics({
  report,
}: LocalDiagnosticsProps) {
  const intl = useIntl()
  return (
    <details className="startup-shell__diagnostics">
      <summary>
        {intl.formatMessage(
          startupShellMessages.diagnosticsSummary,
        )}
      </summary>
      <pre
        aria-label={intl.formatMessage(
          startupShellMessages.diagnosticsLabel,
        )}
        dir="ltr"
      >
        <code>{formatLocalDiagnosticReport(report)}</code>
      </pre>
    </details>
  )
}
