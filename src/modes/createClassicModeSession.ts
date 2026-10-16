import { RuntimeEntitlementBridge } from '../../classic/src/store/runtimeEntitlements'
import { createProductionCanonicalApplicationFactory } from '../../classic/src/application/productionApplicationFactory'
import { createBrowserRuntimeFoundation, type BrowserUiRuntimeFoundation } from '../../classic/src/ui/runtime'
import { SingleHostSessionWriterAuthority } from '../../classic/src/platform/singleHostSessionWriterAuthority'
import { NATIVE_WEB_SAVE_PATHS } from '../../classic/src/platform/platformSaveStorage'
import type { ModeSessionContext, ModeSession } from './modeController'
import { ModeLifecycleAdapter, ModeRuntimeStorage, runtimeModeSession } from './modeRuntimeStorage'
import type { ModeRuntimeHostOptions } from './modeRuntimeHostOptions'

/** This imports only the frozen Classic engine/worker/command graph. No modern
 * simulation or presentation projection participates in Classic execution. */
export async function createClassicModeSession(context: ModeSessionContext,
  options: ModeRuntimeHostOptions & { attach?: (runtime: BrowserUiRuntimeFoundation) => (() => void) }): Promise<ModeSession> {
  if (context.mode !== 'classic') throw new Error('Classic runtime requires Classic storage.')
  const hostEntitlements = options.services ? new RuntimeEntitlementBridge(options.services.entitlements, options.services.doubleInfinityPointsEffect) : undefined
  const paths = NATIVE_WEB_SAVE_PATHS
  const storage = new ModeRuntimeStorage(context, paths.current)
  const lifecycle = new ModeLifecycleAdapter(options.lifecycle)
  const runtime = createBrowserRuntimeFoundation({
    createApplication: createProductionCanonicalApplicationFactory({
      createFirstRunSave: () => { throw new Error('Mode owner must supply a fresh save.') },
      readHostEntitlements: () => hostEntitlements?.currentDysonEntitlements() ?? ({ permanentDoubleIp: false }),
      readDeveloperOptions: () => hostEntitlements?.currentOwnership().developerOptions === true,
    }),
    saveStorage: storage, saveRepositoryPaths: paths,
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
    return runtimeModeSession(runtime, storage, paths.current, lifecycle, options.attach?.(runtime))
  } catch (error) { await runtime.shutdown(); throw error }
}
