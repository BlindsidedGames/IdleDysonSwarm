import { installPresentationStorage, type PresentationStorage } from '../../ui/presentationStorage'
import { createModePresentationStorage } from '../modePresentationStorage'
import type { GameModeController, ModeSession, ModeSessionContext } from '../modeController'
import type { ModeRuntimeHostOptions } from '../modeRuntimeHostOptions'

/** Each production development frame calls this in its own JS/CSS realm.
 * Component tests may invoke it sequentially against detached DOM roots. */
export async function startModeDocument(context: ModeSessionContext, controller: GameModeController,
  container: HTMLElement, preferences: PresentationStorage, options: ModeRuntimeHostOptions): Promise<ModeSession> {
  const release = installPresentationStorage(createModePresentationStorage(context.mode, preferences, context.isCurrent))
  try {
    const session = context.mode === 'classic'
      ? await (await import('./renderClassicGame')).renderClassicGame(context, controller, container, options)
      : await (await import('./renderModernGame')).renderModernGame(context, controller, container, options)
    return { quiesce: () => session.quiesce(), close: async () => { try { await session.close() } finally { release() } } }
  } catch (error) { release(); throw error }
}
