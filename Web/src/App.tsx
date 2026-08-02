import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeImportResult,
} from './ui/runtime'
import type { ReleasePlatformServices } from './platform/releaseFoundation'
import {
  useBrowserRuntimeStatus,
} from './ui/runtime'
import { ReadyDysonRuntimeHost } from './ui/gameplay/dyson'
import type { EnabledLocale } from './ui/i18n'
import {
  selectStartupShellViewModel,
  StartupShell,
  startupShellMessages,
  type StartupShellActions,
  type StartupShellOperationStatus,
} from './ui/shell'
import { StatusFeedback } from './ui/components'

export interface AppProps {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly locale: EnabledLocale
  readonly saveSchemaVersion: number
  readonly sampleUtc: () => string
  readonly reloadSafely: () => Promise<void>
  readonly resetSave?: () => Promise<UiRuntimeImportResult>
  readonly confirmOverwrite?: (message: string) => boolean
  readonly buildId?: string
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly localDeveloperOptionsPurchased?: boolean
}

function App({
  runtime,
  locale,
  saveSchemaVersion,
  sampleUtc,
  reloadSafely,
  resetSave = unavailableReset,
  confirmOverwrite = (message) => window.confirm(message),
  buildId,
  releasePlatformServices,
  localDeveloperOptionsPurchased,
}: AppProps) {
  const intl = useIntl()
  const status = useBrowserRuntimeStatus(runtime)
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
  const beginOperation = useCallback((
    pendingStatus: StartupShellOperationStatus,
  ): boolean => {
    if (operationPendingRef.current) return false
    operationPendingRef.current = true
    setOperationStatus(pendingStatus)
    return true
  }, [])

  const completeOperation = useCallback((
    completedStatus: StartupShellOperationStatus,
  ): void => {
    operationPendingRef.current = false
    setOperationStatus(completedStatus)
  }, [])

  const reloadRequested = useCallback(async (): Promise<void> => {
    if (!beginOperation('reload-pending')) return
    try {
      await reloadSafely()
      completeOperation('reload-completed')
    } catch {
      completeOperation('reload-failed')
    }
  }, [beginOperation, completeOperation, reloadSafely])
  const retryWriterOwnership = useCallback((): void => {
    void runtime.takeOverWriterOwnership()
  }, [runtime])
  const passivelyRetryWriterOwnership =
    useCallback((): void => {
      void runtime.start()
    }, [runtime])
  const writerLeaseExpiry =
    status.phase === 'blocked' &&
    status.code === 'writer-owned'
      ? status.expiresAtUtcMilliseconds
      : undefined
  useEffect(() => {
    if (writerLeaseExpiry === undefined) return undefined
    const delay = Math.max(
      writerLeaseExpiry - Date.now(),
      0,
    ) + 50
    const handle = globalThis.setTimeout(
      passivelyRetryWriterOwnership,
      delay,
    )
    return () => globalThis.clearTimeout(handle)
  }, [
    passivelyRetryWriterOwnership,
    writerLeaseExpiry,
  ])

  if (status.phase === 'ready') {
    const backupRecovered = status.warnings.some(
      (warning) => warning.code === 'backup-recovered',
    )
    return (
      <>
        {backupRecovered && (
          <StatusFeedback tone="warning">
            <FormattedMessage
              {...startupShellMessages.backupRecoveredNotice}
            />
          </StatusFeedback>
        )}
        <ReadyDysonRuntimeHost
          runtime={runtime}
          locale={locale}
          resetSave={resetSave}
          releasePlatformServices={releasePlatformServices}
          localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
        />
      </>
    )
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

  const copyOriginalRequested = async (): Promise<void> => {
    if (!beginOperation('export-pending')) return
    try {
      const copied = await runtime.copyLastRecovery()
      completeOperation(copied ? 'export-succeeded' : 'export-failed')
    } catch {
      completeOperation('export-failed')
    }
  }

  const startFreshRequested = async (): Promise<void> => {
    if (!beginOperation('import-pending')) return
    try {
      try {
        window.localStorage.setItem(
          'idle-dyson-swarm.recovery-choice',
          JSON.stringify({ choice: 'start-fresh', recordedAtUtc: sampleUtc() }),
        )
      } catch {
        // The reset remains available when optional browser preference storage
        // is blocked; canonical save persistence still owns the state change.
      }
      const result = await resetSave()
      setLastImport(result)
      completeOperation(result.imported ? 'import-succeeded' : 'import-failed')
    } catch {
      completeOperation('import-failed')
    }
  }

  const importPastedText = async (text: string): Promise<void> => {
    if (operationPendingRef.current) return
    const approved = confirmOverwrite(
      intl.formatMessage(
        startupShellMessages.importOverwriteConfirmation,
      ),
    )
    if (!approved || !beginOperation('import-pending')) return
    try {
      const importedAtUtc = sampleUtc()
      const result = await runtime.importSave({
        source: 'paste',
        text,
        importedAtUtc,
        overwriteApproved: true,
        context: {
          kind: 'manual-shared-import',
          importedAtUtc,
        },
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
    ...(viewModel.phase === 'writer-blocked'
      ? { takeOverWriter: retryWriterOwnership }
      : {}),
    ...(viewModel.phase === 'ownership-lost'
      ? { checkAgain: () => void reloadRequested() }
      : {}),
    ...(viewModel.phase === 'application-blocked' ||
    viewModel.phase === 'error'
      ? { retry: () => void reloadRequested() }
      : {}),
    ...(viewModel.phase === 'recovery'
      ? {
          retry: () => void reloadRequested(),
          startFresh: () => void startFreshRequested(),
          importSaveText: (text: string) =>
            void importPastedText(text),
          ...((lastImport?.recoveryAvailable ?? false) ||
          runtime.recoveryExportAvailable()
            ? {
                exportRecovery: () =>
                  void exportRecoveryRequested(),
                copyOriginal: () =>
                  void copyOriginalRequested(),
              }
            : {}),
        }
      : {}),
  }

  return (
    <StartupShell
      viewModel={shellViewModel}
      actions={actions}
    />
  )
}

export default App

function unavailableReset(): Promise<UiRuntimeImportResult> {
  return Promise.resolve({
    imported: false,
    committed: false,
    code: 'RUNTIME-RESET-UNAVAILABLE',
    reason: 'Reset is unavailable in this host.',
    recoveryAvailable: false,
  })
}
