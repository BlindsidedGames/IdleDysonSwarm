import type { LifecycleAdapter, RuntimeTarget } from '../platform/contracts'
import { CapacitorAudioBackend } from './capacitorAudioBackend'
import type { GameAudioService } from './contracts'
import { ProductionGameAudioService } from './gameAudioService'
import { WebAudioBackend } from './webAudioBackend'

export function createProductionAudioService(
  target: RuntimeTarget,
  lifecycle: LifecycleAdapter,
): GameAudioService {
  const base = import.meta.env.BASE_URL
  const backend = target === 'ios' || target === 'android'
    ? new CapacitorAudioBackend(target)
    : new WebAudioBackend(
        target,
        `${base}audio/ids-soundtrack.m4a`,
        `${base}audio/button.ogg`,
      )
  return new ProductionGameAudioService({
    backend,
    lifecycle,
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  })
}
