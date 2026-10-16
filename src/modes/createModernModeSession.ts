import { createProductionCanonicalApplicationFactory } from '../application/productionApplicationFactory'
import { createBrowserRuntimeFoundation, type BrowserUiRuntimeFoundation } from '../ui/runtime'
import { SingleHostSessionWriterAuthority } from '../platform/singleHostSessionWriterAuthority'
import { NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import type { ModeSessionContext, ModeSession } from './modeController'
import { ModeLifecycleAdapter, ModeRuntimeStorage, runtimeModeSession } from './modeRuntimeStorage'
import type { ModeRuntimeHostOptions } from './modeRuntimeHostOptions'
import { serializeSharedWebSave } from '../save/serialization'

/** Modern graph with host-owned persistence, lifecycle and entitlement capabilities. */
export async function createModernModeSession(context: ModeSessionContext,
  options: ModeRuntimeHostOptions & { attach?: (runtime: BrowserUiRuntimeFoundation) => (() => void) }): Promise<ModeSession> {
  if (context.mode !== 'modern') throw new Error('Modern runtime requires modern storage.')
  const paths = NATIVE_WEB_SAVE_PATHS
  const storage = new ModeRuntimeStorage(context, paths.current)
  const lifecycle = new ModeLifecycleAdapter(options.lifecycle)
  let application: ReturnType<ReturnType<typeof createProductionCanonicalApplicationFactory>> | undefined
  const createApplication = createProductionCanonicalApplicationFactory({
    createFirstRunSave: () => { throw new Error('Mode owner must supply a fresh save.') },
    readHostEntitlements: () => options.hostEntitlements?.currentDysonEntitlements() ?? ({ permanentDoubleIp: false }),
    readDeveloperOptions: () => options.hostEntitlements?.currentOwnership().developerOptions === true,
  })
  const runtime = createBrowserRuntimeFoundation({
    createApplication: repository => (application = createApplication(repository)),
    saveStorage: storage, saveRepositoryPaths: paths,
    exportSaveFile: options.native?.exportSaveFile?.bind(options.native),
    writerAuthority: new SingleHostSessionWriterAuthority(),
    allowCanonicalPlayerWrites: true, allowedExternalOrigins: options.allowedExternalOrigins ?? [],
    hostEntitlements: options.hostEntitlements,
    developmentControlsAvailable: options.developmentControlsAvailable,
    developmentControlsRequireEntitlement: options.developmentControlsRequireEntitlement,
    lifecycle, lifecycleClock: options.lifecycleClock,
    lifecyclePolicy: options.lifecyclePolicy,
    activeTimeClock: options.activeTimeClock, activeTimeScheduler: options.activeTimeScheduler,
    nowUtcMilliseconds: options.nowUtcMilliseconds,
    departureMarker: options.departureMarker,
    frontendSnapshotScheduler: options.frontendSnapshotScheduler,
    checkpointScheduler: options.checkpointScheduler,
    storageManager: {},
  })
  try {
    if ((await runtime.start()).phase !== 'ready') throw new Error('Modern runtime could not open its save.')
    const session = runtimeModeSession(runtime, storage, paths.current, lifecycle, async () => {
      // Taking a copy must remain available when durable publication fails.
      // The owning application also supplies the pre-Stored-Time boundary.
      const captured = application?.captureSaveTransferSnapshot()
      return captured ? { text: serializeSharedWebSave(captured.prepared.copyValidatedState()), basis: captured.basis } : null
    }, options.attach?.(runtime))
    return {
      exportSave: session.exportSave,
      close: session.close,
      async quiesce() {
        const snapshot = runtime.snapshot()
        if (snapshot.phase === 'ready' && snapshot.operation === 'rework-choice-pending') {
          // This graph has admitted neither gameplay nor time. Its durable input
          // is already the complete pending save; normal checkpoints are blocked
          // until the player chooses migration. Close it without making a choice.
          await session.close()
          return storage.readText(paths.current)
        }
        return session.quiesce()
      },
    }
  } catch (error) { await runtime.shutdown(); throw error }
}
