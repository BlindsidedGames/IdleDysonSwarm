import { createProductionCanonicalApplicationFactory } from '../application/productionApplicationFactory'
import { createBrowserRuntimeFoundation, type BrowserUiRuntimeFoundation } from '../ui/runtime'
import { SingleHostSessionWriterAuthority } from '../platform/singleHostSessionWriterAuthority'
import { NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import type { ModeSessionContext, ModeSession } from './modeController'
import { ModeLifecycleAdapter, ModeRuntimeStorage, runtimeModeSession } from './modeRuntimeStorage'
import type { ModeRuntimeHostOptions } from './modeRuntimeHostOptions'

/** Local-only adapter. Public/native activation is deliberately not composed. */
export async function createModernModeSession(context: ModeSessionContext,
  options: ModeRuntimeHostOptions & { attach?: (runtime: BrowserUiRuntimeFoundation) => (() => void) }): Promise<ModeSession> {
  if (context.mode !== 'modern') throw new Error('Modern runtime requires modern storage.')
  const paths = NATIVE_WEB_SAVE_PATHS
  const storage = new ModeRuntimeStorage(context, paths.current)
  const lifecycle = new ModeLifecycleAdapter(options.lifecycle)
  const runtime = createBrowserRuntimeFoundation({
    createApplication: createProductionCanonicalApplicationFactory({
      createFirstRunSave: () => { throw new Error('Mode owner must supply a fresh save.') },
      readHostEntitlements: () => ({ permanentDoubleIp: false }),
    }),
    saveStorage: storage, saveRepositoryPaths: paths,
    writerAuthority: new SingleHostSessionWriterAuthority(),
    allowCanonicalPlayerWrites: true, allowedExternalOrigins: [],
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
    return runtimeModeSession(runtime, storage, paths.current, lifecycle, options.attach?.(runtime))
  } catch (error) { await runtime.shutdown(); throw error }
}
