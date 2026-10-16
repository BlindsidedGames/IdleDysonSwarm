import { RuntimeEntitlementBridge } from '../../classic/src/store/runtimeEntitlements'
import { createProductionCanonicalApplicationFactory } from '../../classic/src/application/productionApplicationFactory'
import { createBrowserRuntimeFoundation, type BrowserUiRuntimeFoundation } from '../../classic/src/ui/runtime'
import { SingleHostSessionWriterAuthority } from '../../classic/src/platform/singleHostSessionWriterAuthority'
import { NATIVE_WEB_SAVE_PATHS } from '../../classic/src/platform/platformSaveStorage'
import type { ModeSessionContext, ModeSession } from './modeController'
import { ModeLifecycleAdapter, ModeRuntimeStorage, runtimeModeSession } from './modeRuntimeStorage'
import type { ModeRuntimeHostOptions } from './modeRuntimeHostOptions'
import { serializeSharedWebSave } from '../../classic/src/save/serialization'

/** This imports only the frozen Classic engine/worker/command graph. No modern
 * simulation or presentation projection participates in Classic execution. */
export async function createClassicModeSession(context: ModeSessionContext,
  options: ModeRuntimeHostOptions & { attach?: (runtime: BrowserUiRuntimeFoundation) => (() => void) }): Promise<ModeSession> {
  if (context.mode !== 'classic') throw new Error('Classic runtime requires Classic storage.')
  const hostEntitlements = options.services ? new RuntimeEntitlementBridge(options.services.entitlements, options.services.doubleInfinityPointsEffect) : undefined
  const paths = NATIVE_WEB_SAVE_PATHS
  const storage = new ModeRuntimeStorage(context, paths.current)
  const lifecycle = new ModeLifecycleAdapter(options.lifecycle)
  let application: ReturnType<ReturnType<typeof createProductionCanonicalApplicationFactory>> | undefined
  const createApplication = createProductionCanonicalApplicationFactory({
    createFirstRunSave: () => { throw new Error('Mode owner must supply a fresh save.') },
    readHostEntitlements: () => hostEntitlements?.currentDysonEntitlements() ?? ({ permanentDoubleIp: false }),
    readDeveloperOptions: () => hostEntitlements?.currentOwnership().developerOptions === true,
  })
  const runtime = createBrowserRuntimeFoundation({
    createApplication: repository => (application = createApplication(repository)),
    saveStorage: storage, saveRepositoryPaths: paths,
    exportSaveFile: options.native?.exportSaveFile?.bind(options.native),
    writerAuthority: new SingleHostSessionWriterAuthority(),
    allowCanonicalPlayerWrites: true, allowedExternalOrigins: options.allowedExternalOrigins ?? [],
    hostEntitlements,
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
    if ((await runtime.start()).phase !== 'ready') throw new Error('Classic runtime could not open its save.')
    return runtimeModeSession(runtime, storage, paths.current, lifecycle, async () => {
      const captured = application?.captureSaveTransferSnapshot()
      return captured ? { text: serializeSharedWebSave(captured.prepared.copyValidatedState()), basis: captured.basis } : null
    }, options.attach?.(runtime))
  } catch (error) { await runtime.shutdown(); throw error }
}
