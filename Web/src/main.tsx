import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createIntl,
  createIntlCache,
  type IntlShape,
} from 'react-intl'
import App from './App.tsx'
import { renderStaticBootstrapFailure } from './bootstrapFailure'
import { createProductionHostComposition } from './productionHostComposition'
import {
  LOCALE_REGISTRY,
  LocalePreferenceService,
  PresentationIntlProvider,
} from './ui/i18n'
import {
  createProductionPwaUpdateController,
  PwaUpdatePrompt,
} from './pwa'
import {
  StartupErrorBoundary,
  startupShellMessages,
} from './ui/shell'
import './index.css'
import {
  installTextSelectionPolicy,
} from './ui/accessibility/textSelectionPolicy'

installTextSelectionPolicy()
void bootstrap()

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root')
  if (rootElement === null) return
  try {
    const localePreference = new LocalePreferenceService()
    const locale = localePreference.getSnapshot()
    const messages =
      await LOCALE_REGISTRY[locale].loadSharedCatalog()
    const composition = createProductionHostComposition()
    const pwaUpdateController =
      composition.pwaUpdatesAvailable
        ? createProductionPwaUpdateController()
        : undefined
    void pwaUpdateController?.start()
    const boundaryIntl = createIntl(
      {
        locale: LOCALE_REGISTRY[locale].languageTag,
        defaultLocale: 'en',
        messages: messages as IntlShape['messages'],
      },
      createIntlCache(),
    )
    const boundaryCopy = Object.freeze({
      title: boundaryIntl.formatMessage(
        startupShellMessages.boundaryTitle,
      ),
      body: boundaryIntl.formatMessage(
        startupShellMessages.boundaryBody,
      ),
      diagnosticsSummary: boundaryIntl.formatMessage(
        startupShellMessages.diagnosticsSummary,
      ),
      diagnosticsLabel: boundaryIntl.formatMessage(
        startupShellMessages.diagnosticsLabel,
      ),
      reloadAction: boundaryIntl.formatMessage(
        startupShellMessages.reloadAction,
      ),
      exportRecoveryAction: boundaryIntl.formatMessage(
        startupShellMessages.exportRecoveryAction,
      ),
      reloadPending: boundaryIntl.formatMessage(
        startupShellMessages.reloadPending,
      ),
      reloadCompleted: boundaryIntl.formatMessage(
        startupShellMessages.reloadCompleted,
      ),
      reloadFailed: boundaryIntl.formatMessage(
        startupShellMessages.reloadFailed,
      ),
      exportPending: boundaryIntl.formatMessage(
        startupShellMessages.exportPending,
      ),
      exportSucceeded: boundaryIntl.formatMessage(
        startupShellMessages.exportSucceeded,
      ),
      exportFailed: boundaryIntl.formatMessage(
        startupShellMessages.exportFailed,
      ),
    })
    const boundaryActions = Object.freeze({
      reloadSafely: composition.reloadSafely,
      recoveryExportAvailable:
        composition.runtime.recoveryExportAvailable,
      exportRecovery: composition.runtime.exportLastRecovery,
    })
    // Startup is owned once by the composition root, never by a React effect.
    // StrictMode may replay presentation effects without acquiring a second
    // writer lease or shutting down the active runtime.
    void composition.runtime.start().then((snapshot) => {
      if (snapshot.phase !== 'ready') return
      document.documentElement.dataset.idleDysonSwarmRuntime =
        'ready'
      window.dispatchEvent(
        new Event('idle-dyson-swarm-runtime-ready'),
      )
    })
    createRoot(rootElement).render(
      <StrictMode>
        <StartupErrorBoundary
          copy={boundaryCopy}
          actions={boundaryActions}
          diagnosticContext={{
            hostKind: composition.hostKind,
            locale,
            saveSchemaVersion:
              composition.saveSchemaVersion,
          }}
        >
          <PresentationIntlProvider
            locale={locale}
            messages={messages}
          >
            <App
              runtime={composition.runtime}
              locale={locale}
              saveSchemaVersion={
                composition.saveSchemaVersion
              }
              sampleUtc={composition.sampleUtc}
              reloadSafely={composition.reloadSafely}
              resetSave={composition.resetSave}
              buildId={import.meta.env.VITE_BUILD_ID}
              releasePlatformServices={
                composition.releasePlatformServices
              }
            />
            {pwaUpdateController === undefined ? null : (
              <PwaUpdatePrompt
                controller={pwaUpdateController}
                prepareForActivation={
                  composition.prepareForUpdateActivation
                }
              />
            )}
          </PresentationIntlProvider>
        </StartupErrorBoundary>
      </StrictMode>,
    )
  } catch {
    renderStaticBootstrapFailure(rootElement)
  }
}
