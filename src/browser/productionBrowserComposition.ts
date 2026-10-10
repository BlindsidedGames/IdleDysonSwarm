import {
  createProductionCanonicalApplicationFactory,
} from '../application/productionApplicationFactory'
import type {
  CanonicalLifecycleClock,
} from '../application/canonicalLifecycleCoordinator'
import {
  createProductionUnityFirstRunSaveFactory,
  createUnityFirstRunResetRequest,
} from '../application/firstRun/productionFirstRun'
import { CURRENT_SAVE_SCHEMA } from '../save/migrate'
import { REWORK_BETA_DATABASE_NAME, REWORK_BETA_PROFILE_ID, REWORK_BETA_SAVE_PATHS,
  REWORK_BETA_WRITER_TOKEN_KEY, REWORK_BETA_OWNERSHIP_CHANNEL } from './reworkBetaStorage'
import {
  BrowserLifecycleUtcClock,
  BrowserMonotonicClock,
} from '../platform/browserLifecycle'
import {
  createBrowserReloadWriterIdentity,
  type BrowserReloadWriterIdentity,
} from '../platform/browserReloadWriterIdentity'
import {
  BrowserBroadcastOwnershipChannel,
  type OwnershipNoticeChannel,
} from '../platform/browserWriterLease'
import {
  readBrowserHostEntitlements,
  type BrowserEntitlementDocument,
} from '../platform/browserEntitlementAuthority'
import {
  WEB_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'
import type { ReleasePlatformServices } from '../platform/releaseFoundation'
import {
  asAutomaticUnityPurchaseEvidencePromoter,
} from '../save/automaticPurchaseEvidence'

export {
  PRODUCTION_BROWSER_DATABASE_NAME,
  PRODUCTION_BROWSER_PROFILE_ID,
  PRODUCTION_BROWSER_SAVE_PATHS,
} from './productionBrowserStorage'
import { RuntimeEntitlementBridge } from '../store/runtimeEntitlements'
import type {
  DysonPresentationTuning,
} from '../simulation/canonicalDysonDerivation'
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
import {
  recoverTransitionalV2CheckpointWithMetadata,
} from '../save/transitionalV2Checkpoint'

type BrowserRuntimeFactory = (
  options: Readonly<BrowserRuntimeFoundationOptions>,
) => BrowserUiRuntimeFoundation

export interface ProductionBrowserCompositionOptions {
  readonly entitlementDocument?: BrowserEntitlementDocument
  readonly lifecycleClock?: CanonicalLifecycleClock
  readonly monotonicClock?: ActiveTimeMonotonicClock
  readonly createRuntime?: BrowserRuntimeFactory
  readonly reloadPage?: () => void
  readonly dysonPresentationTuning?: Readonly<DysonPresentationTuning>
  readonly writerIdentity?: BrowserReloadWriterIdentity
  readonly ownershipNoticeChannel?: OwnershipNoticeChannel
  /** Native hosts inject their real Store authority through this composition seam. */
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  /** Test seam for preserving release entitlement behavior outside Vite builds. */
  readonly developmentBuild?: boolean
  readonly automaticNumberFormattingAdopter?:
    import('../save/repository').AutomaticUnityNumberFormattingAdopter
  readonly automaticResearchVisibilityAdopter?:
    import('../save/repository').AutomaticUnityResearchVisibilityAdopter
}

export interface ProductionBrowserComposition {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly saveSchemaVersion: number
  sampleUtc(): string
  resetSave(): Promise<UiRuntimeImportResult>
  prepareForUpdateActivation(): Promise<void>
  prepareForSafeReload(): Promise<void>
  reloadSafely(): Promise<void>
}

/**
 * Creates the single browser application graph used by the React root.
 *
 * React receives only the frozen runtime facade and a UTC sampling action.
 * Gameplay configuration, first-run defaults, entitlements, lifecycle,
 * clocks, persistence, and command authority stay outside presentation.
 */
export function createProductionBrowserComposition(
  options: Readonly<ProductionBrowserCompositionOptions> = {},
): ProductionBrowserComposition {
  const lifecycleClock =
    options.lifecycleClock ?? new BrowserLifecycleUtcClock()
  const monotonicClock =
    options.monotonicClock ?? new BrowserMonotonicClock()
  const entitlementDocument =
    options.entitlementDocument ?? document
  const hostEntitlements = options.releasePlatformServices === undefined
    ? undefined
    : new RuntimeEntitlementBridge(
        options.releasePlatformServices.entitlements,
        options.releasePlatformServices.doubleInfinityPointsEffect,
      )
  const createFirstRunSave =
    createProductionUnityFirstRunSaveFactory(lifecycleClock)
  const createApplication =
    createProductionCanonicalApplicationFactory({
      createFirstRunSave,
      readHostEntitlements: () =>
        hostEntitlements?.currentDysonEntitlements() ??
        readBrowserHostEntitlements(entitlementDocument),
      readHostDysonPresentationTuning:
        options.dysonPresentationTuning === undefined
          ? undefined
          : () => options.dysonPresentationTuning!,
    })
  const runtimeFactory =
    options.createRuntime ?? createBrowserRuntimeFoundation
  const writerIdentity =
    options.writerIdentity ??
    createBrowserReloadWriterIdentity({ storageKey: REWORK_BETA_WRITER_TOKEN_KEY })
  const ownershipNoticeChannel =
    options.ownershipNoticeChannel ??
    (options.createRuntime === undefined
      ? createOwnershipNoticeChannel()
      : undefined)
  const developmentBuild =
    options.developmentBuild ?? import.meta.env.DEV
  const runtime = runtimeFactory({
    createApplication,
    lifecyclePolicy: WEB_LIFECYCLE_POLICY,
    allowedExternalOrigins: COMMUNITY_EXTERNAL_ORIGINS,
    databaseName: REWORK_BETA_DATABASE_NAME,
    profileId: REWORK_BETA_PROFILE_ID,
    saveRepositoryPaths: REWORK_BETA_SAVE_PATHS,
    allowCanonicalPlayerWrites: true,
    verifySaveStorage: async () => {
      if (typeof window === 'undefined') return
      if (!window.location.pathname.startsWith('/rework-beta/')) {
        throw new Error('Open the beta at its separate /rework-beta/ address. Existing progress is preserved.')
      }
      const controller = globalThis.navigator?.serviceWorker?.controller
      if (controller !== null && controller !== undefined &&
          new URL(controller.scriptURL, window.location.href).pathname !== '/rework-beta/service-worker.js') {
        throw new Error('A public service worker controls this beta page. Existing progress is preserved; close this page and reopen the beta separately.')
      }
    },
    lifecycleClock,
    activeTimeClock: monotonicClock,
    nowUtcMilliseconds: () =>
      lifecycleClock.sample().utcMilliseconds,
    ownerToken: writerIdentity.ownerToken,
    allowUnexpiredSameOwnerTakeover:
      writerIdentity.allowUnexpiredSameOwnerTakeover,
    noticeChannel: ownershipNoticeChannel,
    hostEntitlements,
    automaticPurchaseEvidencePromoter:
      asAutomaticUnityPurchaseEvidencePromoter(
        options.releasePlatformServices?.entitlements,
      ),
    automaticNumberFormattingAdopter:
      options.automaticNumberFormattingAdopter,
    automaticResearchVisibilityAdopter:
      options.automaticResearchVisibilityAdopter,
    recoverTransitionalCheckpoint:
      recoverTransitionalV2CheckpointWithMetadata,
    createTransitionalRecoveryBase: createFirstRunSave,
    developmentControlsAvailable:
      developmentBuild || options.releasePlatformServices !== undefined
        ? true
        : undefined,
    developmentControlsRequireEntitlement:
      !developmentBuild && options.releasePlatformServices !== undefined,
  })
  const reloadPage =
    options.reloadPage ?? (() => window.location.reload())
  const prepareForSafeReload = () => prepareRuntimeForSafeReload(runtime)
  const prepareForUpdateActivation = async (): Promise<void> => {
    const status = runtime.status()
    if (status.phase !== 'ready') {
      throw new Error(
        'Package updates require a ready runtime and verified checkpoint.',
      )
    }
    const checkpointed = await runtime.checkpointBeforeSafeReload()
    if (!checkpointed) {
      throw new Error(
        'Package updates require a verified checkpoint.',
      )
    }
    await runtime.shutdown()
  }
  return Object.freeze({
    runtime,
    releasePlatformServices: options.releasePlatformServices,
    saveSchemaVersion: CURRENT_SAVE_SCHEMA,
    sampleUtc: () =>
      lifecycleClock.sample().serializedUtcText,
    resetSave: () => runtime.importSave(
      createUnityFirstRunResetRequest(lifecycleClock, createFirstRunSave),
    ),
    prepareForUpdateActivation,
    prepareForSafeReload,
    reloadSafely: async () => {
      await prepareForSafeReload()
      reloadPage()
    },
  })
}

function createOwnershipNoticeChannel():
  | OwnershipNoticeChannel
  | undefined {
  try {
    return new BrowserBroadcastOwnershipChannel(
      REWORK_BETA_OWNERSHIP_CHANNEL,
    )
  } catch {
    return undefined
  }
}
