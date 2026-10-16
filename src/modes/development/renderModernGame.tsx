import { ReactiveStartupErrorBoundary } from '../../ui/shell'
import { installNativeReviewPrompt } from '../../platform/nativeReviewPrompt'
import { ModeSaveActionsContext } from '../../ui/gameplay/settings/modeSaveActions'
import { createRoot } from 'react-dom/client'
import App from '../../App'
import { LocalePreferenceProvider, LocalePreferenceService, loadStartupCatalog } from '../../ui/i18n'
import { NumberNotationProvider, NumberNotationPreferenceService } from '../../ui/number-notation'
import { ResearchVisibilityProvider, ResearchVisibilityPreferenceService } from '../../ui/research-visibility'
import { BottomNavigationTextProvider, BottomNavigationTextPreferenceService } from '../../ui/bottom-navigation-text'
import { createModernModeSession } from '../createModernModeSession'
import { GameModeControllerContext } from '../../ui/gameplay/shell/GameModeControllerContext'
import type { GameModeController, ModeSessionContext } from '../modeController'
import type { ModeRuntimeHostOptions } from '../modeRuntimeHostOptions'
import { PACKAGED_RELEASE_IDENTITY } from '../../packagedReleaseIdentity'
import { resolveReleaseFooter } from '../../platform/releaseFooter'
import '../../index.css'

/** Invoked only inside a separately mounted mode document; no historical
 * bootstrap, store, account, promotion or Cloud service is constructed. */
export async function renderModernGame(context: ModeSessionContext, controller: GameModeController,
  container: HTMLElement, options: ModeRuntimeHostOptions) {
  const locale = new LocalePreferenceService()
  const catalog = await loadStartupCatalog(locale.getSnapshot().locale)
  const releaseFooter = await resolveReleaseFooter({ target: 'browser', developmentBuild: import.meta.env.DEV, source: PACKAGED_RELEASE_IDENTITY })
  const notation = new NumberNotationPreferenceService()
  const research = new ResearchVisibilityPreferenceService()
  const navigation = new BottomNavigationTextPreferenceService()
  const root = createRoot(container)
  try {
    return await createModernModeSession(context, { ...options, attach: runtime => {
      const stopReview = options.native && options.native.target !== 'electron' && options.native.requestStoreReview
        ? installNativeReviewPrompt({ runtime, bridge: options.native }) : undefined
      root.render(<GameModeControllerContext.Provider value={controller}><ModeSaveActionsContext.Provider value={options.saveActions ?? null}>
        <LocalePreferenceProvider preference={locale} initialLocale={catalog.locale} initialMessages={catalog.messages}>
          <NumberNotationProvider preference={notation}><ResearchVisibilityProvider preference={research}>
            <BottomNavigationTextProvider preference={navigation}>
              <ReactiveStartupErrorBoundary actions={{ reloadSafely: options.reloadSafely, recoveryExportAvailable: runtime.recoveryExportAvailable, exportRecovery: runtime.exportLastRecovery }} diagnosticContext={{ hostKind: options.hostKind ?? 'browser', saveSchemaVersion: 21 }}>
              <App key={context.sessionId} runtime={runtime} locale={catalog.locale} saveSchemaVersion={21}
                releaseFooter={options.releaseFooter ?? releaseFooter}
                sampleUtc={() => options.lifecycleClock.sample().serializedUtcText} reloadSafely={options.reloadSafely ?? (async () => { throw new Error('Reload the owning game host.') })} hostKind={options.hostKind} releasePlatformServices={options.services} audio={options.audio} />
              </ReactiveStartupErrorBoundary>
            </BottomNavigationTextProvider>
          </ResearchVisibilityProvider></NumberNotationProvider>
        </LocalePreferenceProvider>
      </ModeSaveActionsContext.Provider></GameModeControllerContext.Provider>)
      return () => { stopReview?.(); root.unmount() }
    } })
  } catch (error) { root.unmount(); throw error }
}
