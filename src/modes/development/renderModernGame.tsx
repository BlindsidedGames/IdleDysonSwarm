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
import '../../index.css'

/** Invoked only inside a separately mounted mode document; no historical
 * bootstrap, store, account, promotion or Cloud service is constructed. */
export async function renderModernGame(context: ModeSessionContext, controller: GameModeController,
  container: HTMLElement, options: ModeRuntimeHostOptions) {
  const locale = new LocalePreferenceService()
  const catalog = await loadStartupCatalog(locale.getSnapshot().locale)
  const notation = new NumberNotationPreferenceService()
  const research = new ResearchVisibilityPreferenceService()
  const navigation = new BottomNavigationTextPreferenceService()
  const root = createRoot(container)
  try {
    return await createModernModeSession(context, { ...options, attach: runtime => {
      root.render(<GameModeControllerContext.Provider value={controller}>
        <LocalePreferenceProvider preference={locale} initialLocale={catalog.locale} initialMessages={catalog.messages}>
          <NumberNotationProvider preference={notation}><ResearchVisibilityProvider preference={research}>
            <BottomNavigationTextProvider preference={navigation}>
              <App key={context.sessionId} runtime={runtime} locale={catalog.locale} saveSchemaVersion={21}
                sampleUtc={() => options.lifecycleClock.sample().serializedUtcText} reloadSafely={async () => { throw new Error('Use the parent development host reload.') }} />
            </BottomNavigationTextProvider>
          </ResearchVisibilityProvider></NumberNotationProvider>
        </LocalePreferenceProvider>
      </GameModeControllerContext.Provider>)
      return () => root.unmount()
    } })
  } catch (error) { root.unmount(); throw error }
}
