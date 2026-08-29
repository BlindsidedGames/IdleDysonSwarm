import { serializeWebSave } from '../../save/serialization'
import type { FirstRunSaveFactory } from '../../save/startupResolver'
import type { ImportSaveRequest } from '../contracts'
import type { CanonicalLifecycleClock } from '../canonicalLifecycleCoordinator'
import { createUnityFirstRunPreparedSave } from './unityFirstRunSave'

export type UnityFirstRunResetRequest = ImportSaveRequest & {
  readonly source: 'paste'
}

export function createProductionUnityFirstRunSaveFactory(
  clock: CanonicalLifecycleClock,
): FirstRunSaveFactory {
  return () => createUnityFirstRunPreparedSave({
    startedAtUtc: clock.sample().serializedUtcText,
  })
}

export function createUnityFirstRunResetRequest(
  clock: CanonicalLifecycleClock,
  createFirstRunSave: FirstRunSaveFactory,
): UnityFirstRunResetRequest {
  const importedAtUtc = clock.sample().serializedUtcText
  const firstRun = createFirstRunSave()
  return {
    source: 'paste',
    text: serializeWebSave(firstRun.copyValidatedState()),
    importedAtUtc,
    overwriteApproved: true,
  }
}
