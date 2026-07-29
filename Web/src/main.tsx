import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createIntl,
  createIntlCache,
  type IntlShape,
} from 'react-intl'
import App from './App.tsx'
import { renderStaticBootstrapFailure } from './bootstrapFailure'
import {
  createProductionBrowserComposition,
} from './browser/productionBrowserComposition'
import {
  LOCALE_REGISTRY,
  LocalePreferenceService,
  PresentationIntlProvider,
} from './ui/i18n'
import {
  StartupErrorBoundary,
  startupShellMessages,
} from './ui/shell'
import './index.css'

void bootstrap()

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root')
  if (rootElement === null) return
  try {
    const localePreference = new LocalePreferenceService()
    const locale = localePreference.getSnapshot()
    const messages =
      await LOCALE_REGISTRY[locale].loadSharedCatalog()
    const composition =
      createProductionBrowserComposition()
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
    })
    const reloadSafely = async () => {
      await composition.runtime.shutdown()
      window.location.reload()
    }

    // Startup is owned once by the composition root, never by a React effect.
    // StrictMode may replay presentation effects without acquiring a second
    // writer lease or shutting down the active runtime.
    void composition.runtime.start()
    createRoot(rootElement).render(
      <StrictMode>
        <StartupErrorBoundary
          copy={boundaryCopy}
          diagnosticContext={{
            hostKind: 'browser-pwa',
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
              reloadSafely={reloadSafely}
              buildId={import.meta.env.VITE_BUILD_ID}
            />
          </PresentationIntlProvider>
        </StartupErrorBoundary>
      </StrictMode>,
    )
  } catch {
    renderStaticBootstrapFailure(rootElement)
  }
}
