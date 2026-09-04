import {
  createProductionCanonicalApplicationFactory,
} from '../application/productionApplicationFactory'
import type {
  CanonicalLifecycleClock,
} from '../application/canonicalLifecycleCoordinator'
import {
  unityFirstRunProvenance,
} from '../application/firstRun/unityFirstRunSave'
import {
  createProductionUnityFirstRunSaveFactory,
  createUnityFirstRunResetRequest,
} from '../application/firstRun/productionFirstRun'
import {
  BrowserLifecycleUtcClock,
  BrowserMonotonicClock,
} from '../platform/browserLifecycle'
import type { NativeHostEnvironment } from '../platform/nativeHostBridge'
import {
  SingleHostSessionWriterAuthority,
} from '../platform/singleHostSessionWriterAuthority'
import {
  CapacitorPlatformSaveStorageAdapter,
  ElectronPlatformSaveStorageAdapter,
  NATIVE_WEB_SAVE_PATHS,
} from '../platform/platformSaveStorage'
import {
  asAutomaticUnityPurchaseEvidencePromoter,
} from '../save/automaticPurchaseEvidence'
import {
  recoverTransitionalV2CheckpointWithMetadata,
} from '../save/transitionalV2Checkpoint'
import {
  MOBILE_LIFECYCLE_POLICY,
  WEB_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'
import { RuntimeEntitlementBridge } from '../store/runtimeEntitlements'
import {
  createBrowserRuntimeFoundation,
  prepareRuntimeForSafeReload,
  type BrowserRuntimeFoundationOptions,
  type BrowserUiRuntimeFoundation,
  type UiRuntimeImportResult,
} from '../ui/runtime'
import type {
  ActiveTimeMonotonicClock,
} from '../ui/runtime/activeTimeDriver'
import { COMMUNITY_EXTERNAL_ORIGINS } from '../platform/communityLinks'

type NativeRuntimeFactory = (
  options: Readonly<BrowserRuntimeFoundationOptions>,
) => BrowserUiRuntimeFoundation

export interface ProductionNativeCompositionOptions {
  readonly lifecycleClock?: CanonicalLifecycleClock
  readonly monotonicClock?: ActiveTimeMonotonicClock
  readonly createRuntime?: NativeRuntimeFactory
  readonly reloadPage?: () => void
  readonly automaticNumberFormattingAdopter?:
    import('../save/repository').AutomaticUnityNumberFormattingAdopter
  readonly automaticResearchVisibilityAdopter?:
    import('../save/repository').AutomaticUnityResearchVisibilityAdopter
}

export interface ProductionNativeComposition {
  readonly hostKind: 'desktop-native' | 'mobile-native'
  readonly runtime: BrowserUiRuntimeFoundation
  readonly releasePlatformServices:
    NativeHostEnvironment['releasePlatformServices']
  readonly saveSchemaVersion: number
  sampleUtc(): string
  resetSave(): Promise<UiRuntimeImportResult>
  prepareForSafeReload(): Promise<void>
  reloadSafely(): Promise<void>
}

/**
 * Builds a native application graph without opening IndexedDB or using the
 * browser composition. Save bytes remain behind the host-rooted bridge;
 * lifecycle and Store authority are supplied by the native package.
 */
export function createProductionNativeComposition(
  environment: Readonly<NativeHostEnvironment>,
  options: Readonly<ProductionNativeCompositionOptions> = {},
): ProductionNativeComposition {
  const lifecycleClock =
    options.lifecycleClock ?? new BrowserLifecycleUtcClock()
  const monotonicClock =
    options.monotonicClock ?? new BrowserMonotonicClock()
  const services = environment.releasePlatformServices
  const entitlementBridge = new RuntimeEntitlementBridge(
    services.entitlements,
    services.doubleInfinityPointsEffect,
  )
  const storage = environment.target === 'electron'
    ? new ElectronPlatformSaveStorageAdapter(
        environment.files,
        environment.migration,
      )
    : new CapacitorPlatformSaveStorageAdapter(
        environment.files,
        environment.migration,
      )
  const createFirstRunSave =
    createProductionUnityFirstRunSaveFactory(lifecycleClock)
  const createApplication =
    createProductionCanonicalApplicationFactory({
      createFirstRunSave,
      achievements: environment.achievements,
      cloud: environment.cloud,
      readDeveloperOptions: () => entitlementBridge.currentOwnership().developerOptions,
      readHostEntitlements: () =>
        entitlementBridge.currentDysonEntitlements(),
    })
  const runtimeFactory =
    options.createRuntime ?? createBrowserRuntimeFoundation
  const runtime = runtimeFactory({
    createApplication,
    lifecyclePolicy:
      environment.target === 'electron'
        ? WEB_LIFECYCLE_POLICY
        : MOBILE_LIFECYCLE_POLICY,
    allowedExternalOrigins: COMMUNITY_EXTERNAL_ORIGINS,
    writerAuthority: new SingleHostSessionWriterAuthority(),
    saveStorage: storage,
    saveRepositoryPaths: NATIVE_WEB_SAVE_PATHS,
    allowCanonicalPlayerWrites: true,
    lifecycle: environment.lifecycle,
    lifecycleClock,
    activeTimeClock: monotonicClock,
    nowUtcMilliseconds: () =>
      lifecycleClock.sample().utcMilliseconds,
    storageManager: {},
    hostEntitlements: entitlementBridge,
    automaticPurchaseEvidencePromoter:
      asAutomaticUnityPurchaseEvidencePromoter(
        services.entitlements,
      ),
    automaticNumberFormattingAdopter:
      options.automaticNumberFormattingAdopter,
    automaticResearchVisibilityAdopter:
      options.automaticResearchVisibilityAdopter,
    recoverTransitionalCheckpoint:
      recoverTransitionalV2CheckpointWithMetadata,
    createTransitionalRecoveryBase: createFirstRunSave,
    developmentControlsAvailable: true,
    developmentControlsRequireEntitlement: true,
  })
  const reloadPage =
    options.reloadPage ?? (() => window.location.reload())
  const prepareForSafeReload = () => prepareRuntimeForSafeReload(runtime)
  environment.installTerminationCheckpoint?.(async () => {
    try {
      const status = runtime.status()
      if (status.phase === 'ready') {
        const checkpointed =
          await runtime.checkpointBeforeSafeReload()
        if (!checkpointed) return false
      } else if (
        status.phase !== 'blocked' &&
        status.phase !== 'ownership-lost' &&
        status.phase !== 'stopped'
      ) {
        return false
      }
      await runtime.shutdown()
      return true
    } catch {
      // Electron will close using the last atomically published save and its
      // backups after its bounded timeout/failure fallback.
      return false
    }
  })
  return Object.freeze({
    hostKind: environment.target === 'electron'
      ? 'desktop-native'
      : 'mobile-native',
    runtime,
    releasePlatformServices: services,
    saveSchemaVersion: unityFirstRunProvenance.saveSchema,
    sampleUtc: () =>
      lifecycleClock.sample().serializedUtcText,
    resetSave: () => runtime.importSave(
      createUnityFirstRunResetRequest(lifecycleClock, createFirstRunSave),
    ),
    prepareForSafeReload,
    reloadSafely: async () => {
      await prepareForSafeReload()
      reloadPage()
    },
  })
}
