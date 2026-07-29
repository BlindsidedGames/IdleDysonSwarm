import {
  Component,
  createRef,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import {
  classifyLocalError,
  createLocalDiagnosticReport,
  formatLocalDiagnosticReport,
  type LocalDiagnosticContext,
  type LocalErrorKind,
} from './diagnostics'
import { startupShellMessages } from './messages'
import './shell.css'

export interface StartupErrorBoundaryCopy {
  readonly title: string
  readonly body: string
  readonly diagnosticsSummary: string
  readonly diagnosticsLabel: string
}

export interface StartupErrorBoundaryProps {
  readonly children: ReactNode
  /**
   * Prelocalized copy may be injected without making the top-level boundary
   * depend on an IntlProvider that could itself fail to render.
   */
  readonly copy?: StartupErrorBoundaryCopy
  readonly diagnosticContext?: Omit<
    LocalDiagnosticContext,
    'phase' | 'code'
  >
}

interface StartupErrorBoundaryState {
  readonly errorKind: LocalErrorKind | null
}

const DEFAULT_COPY: StartupErrorBoundaryCopy = Object.freeze({
  title: startupShellMessages.boundaryTitle.defaultMessage,
  body: startupShellMessages.boundaryBody.defaultMessage,
  diagnosticsSummary:
    startupShellMessages.diagnosticsSummary.defaultMessage,
  diagnosticsLabel:
    startupShellMessages.diagnosticsLabel.defaultMessage,
})

/**
 * Last-resort render isolation. It records only redacted local information and
 * deliberately exposes no retry, reset, persistence, or canonical-state hook.
 */
export class StartupErrorBoundary extends Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  override state: StartupErrorBoundaryState = { errorKind: null }
  readonly #heading = createRef<HTMLHeadingElement>()

  static getDerivedStateFromError(
    error: unknown,
  ): StartupErrorBoundaryState {
    return { errorKind: classifyLocalError(error) }
  }

  override componentDidCatch(
    _error: unknown,
    _errorInfo: ErrorInfo,
  ): void {
    // Intentionally side-effect free. In particular, do not retry startup,
    // reset state, write progress, or send telemetry from this boundary.
  }

  override componentDidMount(): void {
    if (this.state.errorKind !== null) this.#heading.current?.focus()
  }

  override componentDidUpdate(
    _previousProps: StartupErrorBoundaryProps,
    previousState: StartupErrorBoundaryState,
  ): void {
    if (
      previousState.errorKind === null &&
      this.state.errorKind !== null
    ) {
      this.#heading.current?.focus()
    }
  }

  override render(): ReactNode {
    if (this.state.errorKind === null) return this.props.children

    const copy = this.props.copy ?? DEFAULT_COPY
    const report = createLocalDiagnosticReport(
      {
        phase: 'render-failure',
        code: 'render-failed',
        ...this.props.diagnosticContext,
      },
      this.state.errorKind,
    )
    return (
      <main className="startup-shell">
        <div className="startup-shell__frame">
          <section
            className="startup-shell__state"
            aria-labelledby="startup-shell-boundary-heading"
          >
            <h1
              id="startup-shell-boundary-heading"
              className="startup-shell__state-heading"
              ref={this.#heading}
              tabIndex={-1}
            >
              {copy.title}
            </h1>
            <div
              className="ui-status-feedback"
              data-tone="error"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <div>{copy.body}</div>
            </div>
            <details className="startup-shell__diagnostics">
              <summary>{copy.diagnosticsSummary}</summary>
              <pre aria-label={copy.diagnosticsLabel} dir="ltr">
                <code>
                  {formatLocalDiagnosticReport(report)}
                </code>
              </pre>
            </details>
          </section>
        </div>
      </main>
    )
  }
}
