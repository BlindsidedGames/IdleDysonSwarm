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
import { Button } from '../components'
import { startupShellMessages } from './messages'
import './shell.css'

export interface StartupErrorBoundaryCopy {
  readonly title: string
  readonly body: string
  readonly diagnosticsSummary: string
  readonly diagnosticsLabel: string
  readonly reloadAction: string
  readonly exportRecoveryAction: string
  readonly reloadPending: string
  readonly reloadCompleted: string
  readonly reloadFailed: string
  readonly exportPending: string
  readonly exportSucceeded: string
  readonly exportFailed: string
}

export interface StartupErrorBoundaryActions {
  readonly reloadSafely?: () => Promise<void>
  readonly recoveryExportAvailable?: () => boolean
  readonly exportRecovery?: () => Promise<boolean>
}

export interface StartupErrorBoundaryProps {
  readonly children: ReactNode
  /**
   * Prelocalized copy may be injected without making the top-level boundary
   * depend on an IntlProvider that could itself fail to render.
   */
  readonly copy?: StartupErrorBoundaryCopy
  /**
   * Narrow host actions that remain usable after a descendant render failure.
   * They expose no save payload, path, repository, or canonical-state handle.
   */
  readonly actions?: StartupErrorBoundaryActions
  readonly diagnosticContext?: Omit<
    LocalDiagnosticContext,
    'phase' | 'code'
  >
}

type StartupErrorBoundaryOperationStatus =
  | 'reloadPending'
  | 'reloadCompleted'
  | 'reloadFailed'
  | 'exportPending'
  | 'exportSucceeded'
  | 'exportFailed'

type StartupErrorBoundaryOperationKind = 'reload' | 'export'

interface StartupErrorBoundaryState {
  readonly errorKind: LocalErrorKind | null
  readonly operationStatus:
    | StartupErrorBoundaryOperationStatus
    | null
}

const DEFAULT_COPY: StartupErrorBoundaryCopy = Object.freeze({
  title: startupShellMessages.boundaryTitle.defaultMessage,
  body: startupShellMessages.boundaryBody.defaultMessage,
  diagnosticsSummary:
    startupShellMessages.diagnosticsSummary.defaultMessage,
  diagnosticsLabel:
    startupShellMessages.diagnosticsLabel.defaultMessage,
  reloadAction: startupShellMessages.reloadAction.defaultMessage,
  exportRecoveryAction:
    startupShellMessages.exportRecoveryAction.defaultMessage,
  reloadPending: startupShellMessages.reloadPending.defaultMessage,
  reloadCompleted:
    startupShellMessages.reloadCompleted.defaultMessage,
  reloadFailed: startupShellMessages.reloadFailed.defaultMessage,
  exportPending: startupShellMessages.exportPending.defaultMessage,
  exportSucceeded:
    startupShellMessages.exportSucceeded.defaultMessage,
  exportFailed: startupShellMessages.exportFailed.defaultMessage,
})

/**
 * Last-resort render isolation. It records only redacted local information and
 * exposes only explicit safe reload and retained-original export actions
 * supplied by the host. It has no import, reset, retry, save payload, or
 * canonical-state hook.
 */
export class StartupErrorBoundary extends Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  override state: StartupErrorBoundaryState = {
    errorKind: null,
    operationStatus: null,
  }
  readonly #heading = createRef<HTMLHeadingElement>()
  #operationPending = false

  static getDerivedStateFromError(
    error: unknown,
  ): Pick<StartupErrorBoundaryState, 'errorKind'> {
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
    const operationStatus = this.state.operationStatus
    const operationPending =
      operationStatus?.endsWith('Pending') ?? false
    const recoveryExportAvailable =
      this.#recoveryExportAvailable()
    const actionsAvailable =
      this.props.actions?.reloadSafely !== undefined ||
      recoveryExportAvailable
    const operationFailed =
      operationStatus?.endsWith('Failed') ?? false
    const operationSucceeded =
      operationStatus?.endsWith('Succeeded') ||
      operationStatus === 'reloadCompleted'
    return (
      <main className="startup-shell">
        <div className="startup-shell__frame">
          <section
            className="startup-shell__state"
            aria-labelledby="startup-shell-boundary-heading"
            aria-busy={operationPending || undefined}
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
            {operationStatus !== null && (
              <div
                className="ui-status-feedback"
                data-tone={
                  operationFailed
                    ? 'error'
                    : operationSucceeded
                      ? 'success'
                      : undefined
                }
                role={operationFailed ? 'alert' : 'status'}
                aria-live={
                  operationFailed ? 'assertive' : 'polite'
                }
                aria-atomic="true"
              >
                <div>{copy[operationStatus]}</div>
              </div>
            )}
            <details className="startup-shell__diagnostics">
              <summary>{copy.diagnosticsSummary}</summary>
              <pre aria-label={copy.diagnosticsLabel} dir="ltr">
                <code>
                  {formatLocalDiagnosticReport(report)}
                </code>
              </pre>
            </details>
            {actionsAvailable && (
              <div className="startup-shell__actions">
                {this.props.actions?.reloadSafely && (
                  <Button
                    variant="primary"
                    disabled={operationPending}
                    onClick={() => void this.#reloadSafely()}
                  >
                    {copy.reloadAction}
                  </Button>
                )}
                {recoveryExportAvailable && (
                  <Button
                    disabled={operationPending}
                    onClick={() => void this.#exportRecovery()}
                  >
                    {copy.exportRecoveryAction}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

  readonly #reloadSafely = async (): Promise<void> => {
    const reloadSafely = this.props.actions?.reloadSafely
    if (reloadSafely === undefined) return
    await this.#runOperation('reload', reloadSafely)
  }

  readonly #exportRecovery = async (): Promise<void> => {
    const exportRecovery = this.props.actions?.exportRecovery
    if (exportRecovery === undefined) return
    await this.#runOperation('export', exportRecovery)
  }

  async #runOperation(
    kind: StartupErrorBoundaryOperationKind,
    operation: () => Promise<boolean | void>,
  ): Promise<void> {
    const pending =
      kind === 'reload' ? 'reloadPending' : 'exportPending'
    if (!this.#beginOperation(pending)) return
    try {
      const completed = await operation()
      this.#completeOperation(
        completed === false
          ? kind === 'reload'
            ? 'reloadFailed'
            : 'exportFailed'
          : kind === 'reload'
            ? 'reloadCompleted'
            : 'exportSucceeded',
      )
    } catch {
      this.#completeOperation(
        kind === 'reload' ? 'reloadFailed' : 'exportFailed',
      )
    }
  }

  #beginOperation(
    status: Extract<
      StartupErrorBoundaryOperationStatus,
      `${string}Pending`
    >,
  ): boolean {
    if (this.#operationPending) return false
    this.#operationPending = true
    this.setState({ operationStatus: status })
    return true
  }

  #completeOperation(
    status: Exclude<
      StartupErrorBoundaryOperationStatus,
      `${string}Pending`
    >,
  ): void {
    this.#operationPending = false
    this.setState({ operationStatus: status })
  }

  #recoveryExportAvailable(): boolean {
    const actions = this.props.actions
    if (
      actions?.exportRecovery === undefined ||
      actions.recoveryExportAvailable === undefined
    ) {
      return false
    }
    try {
      return actions.recoveryExportAvailable()
    } catch {
      return false
    }
  }
}
