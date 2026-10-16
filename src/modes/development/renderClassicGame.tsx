import { installNativeReviewPrompt } from '../../../classic/src/platform/nativeReviewPrompt'
import { ModeSaveActionsContext } from '../../ui/gameplay/settings/modeSaveActions'
import { createRoot } from 'react-dom/client'
import App from '../../../classic/src/App'
import { LocalePreferenceProvider, LocalePreferenceService, loadStartupCatalog } from '../../../classic/src/ui/i18n'
import { NumberNotationProvider, NumberNotationPreferenceService } from '../../../classic/src/ui/number-notation'
import { ResearchVisibilityProvider, ResearchVisibilityPreferenceService } from '../../../classic/src/ui/research-visibility'
import { BottomNavigationTextProvider, BottomNavigationTextPreferenceService } from '../../../classic/src/ui/bottom-navigation-text'
import { createClassicModeSession } from '../createClassicModeSession'
import { GameModeControllerContext } from '../../ui/gameplay/shell/GameModeControllerContext'
import type { GameModeController, ModeSessionContext } from '../modeController'
import type { ModeRuntimeHostOptions } from '../modeRuntimeHostOptions'
import classicRelease from '../../../classic/release.json'
import '../../../classic/src/index.css'

/** Invoked only inside a separately mounted mode document; no historical
 * bootstrap, store, account, promotion or Cloud service is constructed. */
export async function renderClassicGame(context: ModeSessionContext, controller: GameModeController,
  container: HTMLElement, options: ModeRuntimeHostOptions) {
  const locale = new LocalePreferenceService()
  const catalog = await loadStartupCatalog(locale.getSnapshot().locale)
  const notation = new NumberNotationPreferenceService()
  const research = new ResearchVisibilityPreferenceService()
  const navigation = new BottomNavigationTextPreferenceService()
  const root = createRoot(container)
  try {
    return await createClassicModeSession(context, { ...options, attach: runtime => {
      const stopReview = options.native && options.native.target !== 'electron' && options.native.requestStoreReview
        ? installNativeReviewPrompt({ runtime, bridge: options.native }) : undefined
      root.render(<GameModeControllerContext.Provider value={controller}><ModeSaveActionsContext.Provider value={options.saveActions ?? null}>
        <LocalePreferenceProvider preference={locale} initialLocale={catalog.locale} initialMessages={catalog.messages}>
          <NumberNotationProvider preference={notation}><ResearchVisibilityProvider preference={research}>
            <BottomNavigationTextProvider preference={navigation}>
              <App key={context.sessionId} runtime={runtime} locale={catalog.locale} saveSchemaVersion={20}
                releaseFooter={{ ...(options.releaseFooter ?? { platform: 'Dev', build: 'local' }), version: `C-${classicRelease.version}` }}
                sampleUtc={() => options.lifecycleClock.sample().serializedUtcText} reloadSafely={options.reloadSafely ?? (async () => { throw new Error('Reload the owning game host.') })} hostKind={options.hostKind} releasePlatformServices={options.services} audio={options.audio} />
            </BottomNavigationTextProvider>
          </ResearchVisibilityProvider></NumberNotationProvider>
        </LocalePreferenceProvider>
      </ModeSaveActionsContext.Provider></GameModeControllerContext.Provider>)
      return () => { stopReview?.(); root.unmount() }
    } })
  } catch (error) { root.unmount(); throw error }
}
