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
  NativeLaunchPresentationGate,
  StartupErrorBoundary,
  startupShellMessages,
} from './ui/shell'
import './index.css'
import {
  installTextSelectionPolicy,
} from './ui/accessibility/textSelectionPolicy'
import { installSemanticAudioCues } from './audio'
import {
  detectNativeHostBridge,
  installNativeSafeAreaInsets,
} from './platform/nativeHostBridge'
import {
  createNativeLaunchDismissalController,
} from './platform/nativeLaunchScreen'
import {
  NumberNotationPreferenceService,
  NumberNotationProvider,
} from './ui/number-notation'
import {
  ResearchVisibilityPreferenceService,
  ResearchVisibilityProvider,
} from './ui/research-visibility'
import {
  BottomNavigationSizePreferenceService,
  BottomNavigationSizeProvider,
} from './ui/bottom-navigation-size'

installTextSelectionPolicy()
void bootstrap()

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root')
  if (rootElement === null) return
  const nativeLaunch = createNativeLaunchDismissalController()
  try {
    const nativeBridge = detectNativeHostBridge()
    if (nativeBridge !== null) {
      nativeLaunch.armFailsafe()
    }
    await Promise.all([
      boundedBootstrapPrerequisite(installNativeSafeAreaInsets()),
      boundedBootstrapPrerequisite(
        nativeBridge?.ready?.() ?? Promise.resolve(),
      ),
    ])
    const localePreference = new LocalePreferenceService()
    const locale = localePreference.getSnapshot()
    const messages =
      await LOCALE_REGISTRY[locale].loadSharedCatalog()
    const numberNotationPreference =
      new NumberNotationPreferenceService()
    const researchVisibilityPreference =
      new ResearchVisibilityPreferenceService()
    const bottomNavigationSizePreference =
      new BottomNavigationSizePreferenceService()
    const composition = createProductionHostComposition({
      detectNativeBridge: () => nativeBridge,
      automaticNumberFormattingAdopter: numberNotationPreference,
      automaticResearchVisibilityAdopter: researchVisibilityPreference,
    })
    void composition.audio.initialize().catch(() => undefined)
    installSemanticAudioCues(document, composition.audio)
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
        <NativeLaunchPresentationGate
          enabled={composition.hostKind !== 'browser'}
          onPresented={() => {
            void nativeLaunch.dismissNow()
          }}
        />
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
            <NumberNotationProvider preference={numberNotationPreference}>
              <BottomNavigationSizeProvider
                preference={bottomNavigationSizePreference}
              >
                <ResearchVisibilityProvider
                  preference={researchVisibilityPreference}
                >
                  <App
                    runtime={composition.runtime}
                    hostKind={composition.hostKind}
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
                    audio={composition.audio}
                  />
                  {pwaUpdateController === undefined ? null : (
                    <PwaUpdatePrompt
                      controller={pwaUpdateController}
                      prepareForActivation={
                        composition.prepareForUpdateActivation
                      }
                    />
                  )}
                </ResearchVisibilityProvider>
              </BottomNavigationSizeProvider>
            </NumberNotationProvider>
          </PresentationIntlProvider>
        </StartupErrorBoundary>
      </StrictMode>,
    )
  } catch {
    renderStaticBootstrapFailure(rootElement)
    await nativeLaunch.dismissNow()
  }
}

function boundedBootstrapPrerequisite<T>(
  prerequisite: Promise<T>,
  timeoutMilliseconds = 1_500,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(
      () => resolve(undefined),
      timeoutMilliseconds,
    )
    void prerequisite.then(
      (value) => {
        globalThis.clearTimeout(timeout)
        resolve(value)
      },
      () => {
        globalThis.clearTimeout(timeout)
        resolve(undefined)
      },
    )
  })
}
