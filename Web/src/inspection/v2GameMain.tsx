import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createIntl, createIntlCache, type IntlShape } from 'react-intl'
import App from '../App'
import { LOCALE_REGISTRY, LocalePreferenceService, PresentationIntlProvider } from '../ui/i18n'
import { StartupErrorBoundary, startupShellMessages } from '../ui/shell'
import { createV2GameRuntimeController } from './v2GameRuntime'
import '../index.css'
import './v2Game.css'

let maximumLongTaskMilliseconds = 0
if (typeof PerformanceObserver !== 'undefined') {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        maximumLongTaskMilliseconds = Math.max(
          maximumLongTaskMilliseconds,
          entry.duration,
        )
      }
      document.documentElement.dataset.v2MaxLongTaskMs =
        maximumLongTaskMilliseconds.toFixed(3)
    })
    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    // Long Tasks are optional inspection telemetry, never runtime authority.
  }
}

void bootstrap()

async function bootstrap(): Promise<void> {
  const root = document.getElementById('root')
  if (root === null) return
  const locale = new LocalePreferenceService().getSnapshot()
  const messages = await LOCALE_REGISTRY[locale].loadSharedCatalog()
  const controller = createV2GameRuntimeController()
  const intl = createIntl({
    locale: LOCALE_REGISTRY[locale].languageTag,
    defaultLocale: 'en',
    messages: messages as IntlShape['messages'],
  }, createIntlCache())
  const copy = Object.freeze({
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
  void controller.runtime.start().then((status) => {
    if (status.phase === 'ready') {
      document.documentElement.dataset.idleDysonSwarmRuntime = 'ready'
      window.dispatchEvent(new Event('idle-dyson-swarm-runtime-ready'))
    }
  })
  createRoot(root).render(
    <StrictMode>
      <StartupErrorBoundary
        copy={copy}
        actions={{
          reloadSafely: async () => {
            await controller.checkpoint()
            location.reload()
          },
          recoveryExportAvailable: () => false,
          exportRecovery: async () => false,
        }}
        diagnosticContext={{ hostKind: 'browser', locale, saveSchemaVersion: 13 }}
      >
        <PresentationIntlProvider locale={locale} messages={messages}>
          <V2Game controller={controller} locale={locale} />
        </PresentationIntlProvider>
      </StartupErrorBoundary>
    </StrictMode>,
  )
}

function V2Game({
  controller,
  locale,
}: Readonly<{
  controller: ReturnType<typeof createV2GameRuntimeController>
  locale: ReturnType<LocalePreferenceService['getSnapshot']>
}>) {
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('This is the isolated V2/schema13 full-game candidate.')
  const actions = useMemo(() => ({
    huge: async () => {
      setWorking(true)
      try {
        await controller.setHugeInspectionValues()
        setMessage('Exact 1e1000 resources applied and read back from schema13.')
      } finally { setWorking(false) }
    },
    save: async () => {
      setWorking(true)
      try {
        const saved = await controller.checkpoint()
        setMessage(saved ? 'Schema13 save was written and read back.' : 'Save was not available.')
      } finally { setWorking(false) }
    },
    reset: async () => {
      setWorking(true)
      await controller.resetIsolatedSave()
    },
  }), [controller])
  return <>
    <aside className="v2-game-tools" aria-label="V2 local inspection controls">
      <strong>Local V2/schema13 candidate</strong>
      <span role="status">{message}</span>
      <div>
        <button disabled={working} onClick={() => void actions.huge()}>Set exact 1e1000 values</button>
        <button disabled={working} onClick={() => void actions.save()}>Save now</button>
        <button disabled={working} onClick={() => location.reload()}>Reload</button>
        <button disabled={working} onClick={() => void actions.reset()}>Reset isolated V2 save</button>
      </div>
    </aside>
    <App
      runtime={controller.runtime}
      locale={locale}
      saveSchemaVersion={13}
      sampleUtc={() => new Date().toISOString()}
      reloadSafely={async () => {
        await controller.checkpoint()
        location.reload()
      }}
      resetSave={async () => {
        await controller.resetIsolatedSave()
        return {
          imported: true,
          sessionRevision: 0,
          recoveryAvailable: true,
          lifecycleReset: true,
        }
      }}
      buildId={import.meta.env.VITE_BUILD_ID}
    />
  </>
}
