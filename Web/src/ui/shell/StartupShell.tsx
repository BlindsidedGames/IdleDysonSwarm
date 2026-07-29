import { useEffect, useRef } from 'react'
import {
  FormattedMessage,
  type MessageDescriptor,
} from 'react-intl'
import { Button, StatusFeedback } from '../components'
import type {
  StartupShellActions,
  StartupShellOperationStatus,
  StartupShellPhase,
  StartupShellViewModel,
} from './contracts'
import { LocalDiagnostics } from './LocalDiagnostics'
import { startupShellMessages } from './messages'
import './shell.css'

export interface StartupShellProps {
  readonly viewModel: StartupShellViewModel
  readonly actions?: StartupShellActions
}

interface StatePresentation {
  readonly title: MessageDescriptor
  readonly body: MessageDescriptor
  readonly tone: 'neutral' | 'success' | 'warning' | 'error'
  readonly pending: boolean
}

const STATE_PRESENTATION: Readonly<
  Record<StartupShellPhase, StatePresentation>
> = Object.freeze({
  idle: {
    title: startupShellMessages.idleTitle,
    body: startupShellMessages.idleBody,
    tone: 'neutral',
    pending: false,
  },
  starting: {
    title: startupShellMessages.startingTitle,
    body: startupShellMessages.startingBody,
    tone: 'neutral',
    pending: true,
  },
  'writer-blocked': {
    title: startupShellMessages.writerBlockedTitle,
    body: startupShellMessages.writerBlockedBody,
    tone: 'warning',
    pending: false,
  },
  'application-blocked': {
    title: startupShellMessages.applicationBlockedTitle,
    body: startupShellMessages.applicationBlockedBody,
    tone: 'error',
    pending: false,
  },
  recovery: {
    title: startupShellMessages.recoveryTitle,
    body: startupShellMessages.recoveryBody,
    tone: 'warning',
    pending: false,
  },
  'ready-placeholder': {
    title: startupShellMessages.readyPlaceholderTitle,
    body: startupShellMessages.readyPlaceholderBody,
    tone: 'success',
    pending: false,
  },
  'ownership-lost': {
    title: startupShellMessages.ownershipLostTitle,
    body: startupShellMessages.ownershipLostBody,
    tone: 'error',
    pending: false,
  },
  stopping: {
    title: startupShellMessages.stoppingTitle,
    body: startupShellMessages.stoppingBody,
    tone: 'neutral',
    pending: true,
  },
  error: {
    title: startupShellMessages.errorTitle,
    body: startupShellMessages.errorBody,
    tone: 'error',
    pending: false,
  },
})

const OPERATION_PRESENTATION: Readonly<
  Record<
    StartupShellOperationStatus,
    {
      readonly message: MessageDescriptor
      readonly tone: 'neutral' | 'success' | 'error'
    }
  >
> = Object.freeze({
  'import-pending': {
    message: startupShellMessages.importPending,
    tone: 'neutral',
  },
  'import-succeeded': {
    message: startupShellMessages.importSucceeded,
    tone: 'success',
  },
  'import-failed': {
    message: startupShellMessages.importFailed,
    tone: 'error',
  },
  'export-pending': {
    message: startupShellMessages.exportPending,
    tone: 'neutral',
  },
  'export-succeeded': {
    message: startupShellMessages.exportSucceeded,
    tone: 'success',
  },
  'export-failed': {
    message: startupShellMessages.exportFailed,
    tone: 'error',
  },
  'reload-pending': {
    message: startupShellMessages.reloadPending,
    tone: 'neutral',
  },
  'reload-completed': {
    message: startupShellMessages.reloadCompleted,
    tone: 'success',
  },
  'reload-failed': {
    message: startupShellMessages.reloadFailed,
    tone: 'error',
  },
})

export function StartupShell({
  viewModel,
  actions = {},
}: StartupShellProps) {
  const stateHeading = useRef<HTMLHeadingElement>(null)
  const presentation = STATE_PRESENTATION[viewModel.phase]
  const operationPending =
    viewModel.operationStatus?.endsWith('-pending') ?? false

  useEffect(() => {
    stateHeading.current?.focus()
  }, [viewModel.phase])

  return (
    <main className="startup-shell">
      <div className="startup-shell__frame">
        <h1 className="startup-shell__app-name">
          <FormattedMessage {...startupShellMessages.appName} />
        </h1>
        <section
          className="startup-shell__state"
          aria-labelledby="startup-shell-state-heading"
          aria-busy={
            presentation.pending || operationPending || undefined
          }
        >
          <h2
            id="startup-shell-state-heading"
            className="startup-shell__state-heading"
            ref={stateHeading}
            tabIndex={-1}
          >
            <FormattedMessage {...presentation.title} />
          </h2>
          <StatusFeedback tone={presentation.tone}>
            <FormattedMessage {...presentation.body} />
          </StatusFeedback>
          {viewModel.operationStatus && (
            <OperationFeedback
              status={viewModel.operationStatus}
            />
          )}
          {viewModel.diagnostics && (
            <LocalDiagnostics report={viewModel.diagnostics} />
          )}
          <StartupActions
            phase={viewModel.phase}
            actions={actions}
          />
        </section>
      </div>
    </main>
  )
}

function OperationFeedback({
  status,
}: {
  readonly status: StartupShellOperationStatus
}) {
  const presentation = OPERATION_PRESENTATION[status]
  return (
    <StatusFeedback
      className="startup-shell__operation-feedback"
      tone={presentation.tone}
    >
      <FormattedMessage {...presentation.message} />
    </StatusFeedback>
  )
}

interface StartupActionsProps {
  readonly phase: StartupShellPhase
  readonly actions: StartupShellActions
}

function StartupActions({
  phase,
  actions,
}: StartupActionsProps) {
  const buttons = actionButtons(phase, actions)
  if (buttons.length === 0) return null
  return (
    <div className="startup-shell__actions">
      {buttons.map((button) => (
        <Button
          key={button.key}
          variant={button.variant}
          onClick={button.onClick}
          disabled={button.disabled}
        >
          <FormattedMessage {...button.message} />
        </Button>
      ))}
    </div>
  )
}

interface ActionButton {
  readonly key: string
  readonly message: MessageDescriptor
  readonly variant: 'primary' | 'secondary'
  readonly onClick: () => void
  readonly disabled: boolean
}

function actionButtons(
  phase: StartupShellPhase,
  actions: StartupShellActions,
): readonly ActionButton[] {
  switch (phase) {
    case 'idle':
      return actions.start
        ? [
            {
              key: 'start',
              message: startupShellMessages.startAction,
              variant: 'primary',
              onClick: actions.start,
              disabled: actions.disabled ?? false,
            },
          ]
        : []
    case 'writer-blocked':
    case 'ownership-lost':
      return actions.checkAgain
        ? [
            {
              key: 'check-again',
              message: startupShellMessages.checkAgainAction,
              variant: 'primary',
              onClick: actions.checkAgain,
              disabled: actions.disabled ?? false,
            },
          ]
        : []
    case 'application-blocked':
    case 'error':
      return actions.retry
        ? [
            {
              key: 'retry',
              message: startupShellMessages.retryAction,
              variant: 'primary',
              onClick: actions.retry,
              disabled: actions.disabled ?? false,
            },
          ]
        : []
    case 'recovery':
      return [
        ...(actions.importSave
          ? [
              {
                key: 'import',
                message: startupShellMessages.importAction,
                variant: 'primary' as const,
                onClick: actions.importSave,
                disabled: actions.disabled ?? false,
              },
            ]
          : []),
        ...(actions.exportRecovery
          ? [
              {
                key: 'export-recovery',
                message:
                  startupShellMessages.exportRecoveryAction,
                variant: 'secondary' as const,
                onClick: actions.exportRecovery,
                disabled: actions.disabled ?? false,
              },
            ]
          : []),
      ]
    case 'starting':
    case 'ready-placeholder':
    case 'stopping':
      return []
  }
}
