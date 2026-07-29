import { useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeImportResult,
} from './ui/runtime'
import {
  useBrowserRuntimeStatus,
} from './ui/runtime'
import {
  selectStartupShellViewModel,
  StartupShell,
  startupShellMessages,
  type StartupShellActions,
  type StartupShellOperationStatus,
} from './ui/shell'

export interface AppProps {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly locale: string
  readonly saveSchemaVersion: number
  readonly sampleUtc: () => string
  readonly reloadSafely: () => Promise<void>
  readonly confirmOverwrite?: (message: string) => boolean
  readonly buildId?: string
}

function App({
  runtime,
  locale,
  saveSchemaVersion,
  sampleUtc,
  reloadSafely,
  confirmOverwrite = (message) => window.confirm(message),
  buildId,
}: AppProps) {
  const intl = useIntl()
  const status = useBrowserRuntimeStatus(runtime)
  const fileInput = useRef<HTMLInputElement>(null)
  const operationPendingRef = useRef(false)
  const [lastImport, setLastImport] =
    useState<UiRuntimeImportResult | null>(null)
  const [operationStatus, setOperationStatus] =
    useState<StartupShellOperationStatus>()
  const viewModel = useMemo(
    () =>
      selectStartupShellViewModel(status, {
        locale,
        saveSchemaVersion,
        buildId,
      }),
    [buildId, locale, saveSchemaVersion, status],
  )
  const shellViewModel = useMemo(
    () =>
      Object.freeze({
        ...viewModel,
        ...(operationStatus === undefined
          ? {}
          : { operationStatus }),
      }),
    [operationStatus, viewModel],
  )
  const operationPending =
    operationStatus?.endsWith('-pending') ?? false

  const beginOperation = (
    pendingStatus: StartupShellOperationStatus,
  ): boolean => {
    if (operationPendingRef.current) return false
    operationPendingRef.current = true
    setOperationStatus(pendingStatus)
    return true
  }

  const completeOperation = (
    completedStatus: StartupShellOperationStatus,
  ): void => {
    operationPendingRef.current = false
    setOperationStatus(completedStatus)
  }

  const reloadRequested = async (): Promise<void> => {
    if (!beginOperation('reload-pending')) return
    try {
      await reloadSafely()
      completeOperation('reload-completed')
    } catch {
      completeOperation('reload-failed')
    }
  }

  const exportRecoveryRequested = async (): Promise<void> => {
    if (!beginOperation('export-pending')) return
    try {
      const exported = await runtime.exportLastRecovery()
      completeOperation(
        exported ? 'export-succeeded' : 'export-failed',
      )
    } catch {
      completeOperation('export-failed')
    }
  }

  const importSelectedFile = async (
    file: File | undefined,
  ): Promise<void> => {
    if (file === undefined || operationPendingRef.current) return
    const approved = confirmOverwrite(
      intl.formatMessage(
        startupShellMessages.importOverwriteConfirmation,
      ),
    )
    if (!approved || !beginOperation('import-pending')) return
    try {
      const result = await runtime.importSave({
        source: 'file',
        file,
        importedAtUtc: sampleUtc(),
        overwriteApproved: true,
      })
      setLastImport(result)
      completeOperation(
        result.imported
          ? 'import-succeeded'
          : 'import-failed',
      )
    } catch {
      completeOperation('import-failed')
    }
  }

  const actions: StartupShellActions = {
    disabled: operationPending,
    ...(viewModel.phase === 'idle'
      ? { start: () => void runtime.start() }
      : {}),
    ...(viewModel.phase === 'writer-blocked' ||
    viewModel.phase === 'ownership-lost'
      ? { checkAgain: () => void reloadRequested() }
      : {}),
    ...(viewModel.phase === 'application-blocked' ||
    viewModel.phase === 'error'
      ? { retry: () => void reloadRequested() }
      : {}),
    ...(viewModel.phase === 'recovery'
      ? {
          importSave: () => fileInput.current?.click(),
          ...(lastImport?.recoveryAvailable
            ? {
                exportRecovery: () =>
                  void exportRecoveryRequested(),
              }
            : {}),
        }
      : {}),
  }

  return (
    <>
      <StartupShell
        viewModel={shellViewModel}
        actions={actions}
      />
      <input
        ref={fileInput}
        data-testid="startup-save-file"
        type="file"
        accept=".txt,text/plain"
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const input = event.currentTarget
          void importSelectedFile(input.files?.[0]).finally(() => {
            input.value = ''
          })
        }}
      />
    </>
  )
}

export default App
