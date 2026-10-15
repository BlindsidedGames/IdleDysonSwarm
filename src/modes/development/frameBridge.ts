import type { ModeSaveActions } from '../../ui/gameplay/settings/modeSaveActions'
import type { ModeSessionContext, ModeSession, GameModeController } from '../modeController'
import type { PresentationStorage } from '../../ui/presentationStorage'
export interface DevelopmentFrameBridge {
  connect(token: string, caller: Window): {
    context: ModeSessionContext
    controller: GameModeController
    preferences: PresentationStorage
    runtimeTarget: 'browser' | 'electron' | 'ios' | 'android'
    saveActions: ModeSaveActions
    ready(session: ModeSession): void
    fail(error: unknown): void
  }
}
declare global { interface Window { __IDS_MODE_DEVELOPMENT_BRIDGE__?: DevelopmentFrameBridge } }
