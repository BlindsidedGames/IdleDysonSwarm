import type { ModeSession, ModeSessionContext, GameModeController } from './modeController'
import type { ModeRuntimeHostOptions } from './modeRuntimeHostOptions'
import type { PresentationStorage } from '../ui/presentationStorage'
export interface ProductionFrameBridge {
  connect(token: string, caller: Window): {
    context: ModeSessionContext
    controller: GameModeController
    preferences: PresentationStorage
    target: 'browser' | 'electron' | 'ios' | 'android'
    native?: import('../platform/nativeHostBridge').NativeHostBridgeApi
    options: ModeRuntimeHostOptions
    ready(session: ModeSession): void
    fail(error: unknown): void
  }
}
declare global { interface Window { __IDS_MODE_HOST__?: ProductionFrameBridge } }
