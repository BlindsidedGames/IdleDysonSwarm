import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createIntl,
  createIntlCache,
  type IntlShape,
} from 'react-intl'
import LocalizedApp from './LocalizedApp.tsx'
import { renderStaticBootstrapFailure } from './bootstrapFailure'
import { createProductionHostComposition } from './productionHostComposition'
import {
  LOCALE_REGISTRY,
  LocalePreferenceProvider,
  LocalePreferenceService,
  loadStartupCatalog,
} from './ui/i18n'
import {
  createProductionPwaUpdateController,
  PwaUpdatePrompt,
} from './pwa'
import {
  NativeLaunchPresentationGate,
  ReactiveStartupErrorBoundary,
  StartupErrorBoundary,
  formatStartupBoundaryCopy,
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
import { installNativeReviewPrompt } from './platform/nativeReviewPrompt'
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
  BottomNavigationTextPreferenceService,
  BottomNavigationTextProvider,
} from './ui/bottom-navigation-text'
import { PACKAGED_RELEASE_IDENTITY } from './packagedReleaseIdentity'
import {
  desktopDistributionFromBuildValue,
  resolveReleaseFooter,
} from './platform/releaseFooter'

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
    const locale = localePreference.getSnapshot().locale
    const startupCatalog = await loadStartupCatalog(locale, {
      onDiagnostic: (diagnostic) => {
        console.warn(
          `Startup locale diagnostic ${diagnostic.code} for ${diagnostic.locale}; using bundled English catalog.`,
        )
      },
    })
    const effectiveLocale = startupCatalog.locale
    const messages = startupCatalog.messages
    localePreference.applyEffectiveLocale(effectiveLocale)
    const numberNotationPreference =
      new NumberNotationPreferenceService()
    const researchVisibilityPreference =
      new ResearchVisibilityPreferenceService()
    const bottomNavigationTextPreference =
      new BottomNavigationTextPreferenceService()
    const composition = createProductionHostComposition({
      detectNativeBridge: () => nativeBridge,
      automaticNumberFormattingAdopter: numberNotationPreference,
      automaticResearchVisibilityAdopter: researchVisibilityPreference,
    })
    const releaseFooter = await resolveReleaseFooter({
      target: nativeBridge?.target ?? 'browser',
      developmentBuild: import.meta.env.DEV,
      source: PACKAGED_RELEASE_IDENTITY,
      metadata: composition.releasePlatformServices?.metadata,
      onMetadataLookupFailure: (failure) => {
        console.warn(
          `Native release metadata ${failure}; using packaged release identity.`,
        )
      },
      desktopDistribution:
        nativeBridge?.target === 'electron' && !import.meta.env.DEV
          ? desktopDistributionFromBuildValue(
              import.meta.env.VITE_IDS_DESKTOP_DISTRIBUTION,
            )
          : undefined,
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
        locale: LOCALE_REGISTRY[effectiveLocale].languageTag,
        defaultLocale: 'en',
        messages: messages as IntlShape['messages'],
      },
      createIntlCache(),
    )
    const boundaryCopy = formatStartupBoundaryCopy(boundaryIntl)
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
      if (
        nativeBridge !== null &&
        nativeBridge.target !== 'electron' &&
        nativeBridge.requestStoreReview !== undefined
      ) {
        const stopReviewPrompt = installNativeReviewPrompt({
          runtime: composition.runtime,
          bridge: nativeBridge,
        })
        window.addEventListener('pagehide', stopReviewPrompt, {
          once: true,
        })
      }
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
            locale: effectiveLocale,
            saveSchemaVersion:
              composition.saveSchemaVersion,
          }}
        >
          <LocalePreferenceProvider
            preference={localePreference}
            initialLocale={effectiveLocale}
            initialMessages={messages}
          >
            <ReactiveStartupErrorBoundary
              actions={boundaryActions}
              diagnosticContext={{
                hostKind: composition.hostKind,
                saveSchemaVersion: composition.saveSchemaVersion,
              }}
            >
              <NumberNotationProvider preference={numberNotationPreference}>
              <BottomNavigationTextProvider
                preference={bottomNavigationTextPreference}
              >
                <ResearchVisibilityProvider
                  preference={researchVisibilityPreference}
                >
                  <LocalizedApp
                    runtime={composition.runtime}
                    hostKind={composition.hostKind}
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
                    releaseFooter={releaseFooter}
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
              </BottomNavigationTextProvider>
              </NumberNotationProvider>
            </ReactiveStartupErrorBoundary>
          </LocalePreferenceProvider>
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
