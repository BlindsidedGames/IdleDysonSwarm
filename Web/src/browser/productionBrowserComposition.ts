import {
  createProductionCanonicalApplicationFactory,
} from '../application/productionApplicationFactory'
import type {
  CanonicalLifecycleClock,
} from '../application/canonicalLifecycleCoordinator'
import {
  createUnityFirstRunPreparedSave,
  unityFirstRunProvenance,
} from '../application/firstRun/unityFirstRunSave'
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
import { serializeWebSave } from '../save/serialization'
import type {
  DysonPresentationTuning,
} from '../simulation/canonicalDysonDerivation'
import {
  createBrowserRuntimeFoundation,
  type BrowserRuntimeFoundationOptions,
  type BrowserUiRuntimeFoundation,
  type UiRuntimeImportResult,
} from '../ui/runtime'
import type {
  ActiveTimeMonotonicClock,
} from '../ui/runtime/activeTimeDriver'

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
}

export interface ProductionBrowserComposition {
  readonly runtime: BrowserUiRuntimeFoundation
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
  const createFirstRunSave = () =>
    createUnityFirstRunPreparedSave({
      startedAtUtc:
        lifecycleClock.sample().serializedUtcText,
    })
  const createApplication =
    createProductionCanonicalApplicationFactory({
      createFirstRunSave,
      readHostEntitlements: () =>
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
    createBrowserReloadWriterIdentity()
  const ownershipNoticeChannel =
    options.ownershipNoticeChannel ??
    (options.createRuntime === undefined
      ? createOwnershipNoticeChannel()
      : undefined)
  const runtime = runtimeFactory({
    createApplication,
    lifecyclePolicy: WEB_LIFECYCLE_POLICY,
    allowedExternalOrigins: [],
    lifecycleClock,
    activeTimeClock: monotonicClock,
    nowUtcMilliseconds: () =>
      lifecycleClock.sample().utcMilliseconds,
    ownerToken: writerIdentity.ownerToken,
    allowUnexpiredSameOwnerTakeover:
      writerIdentity.allowUnexpiredSameOwnerTakeover,
    noticeChannel: ownershipNoticeChannel,
  })
  const reloadPage =
    options.reloadPage ?? (() => window.location.reload())
  const prepareForSafeReload = async (): Promise<void> => {
    const status = runtime.status()
    if (status.phase === 'ready') {
      const checkpointed =
        await runtime.checkpointBeforeSafeReload()
      if (!checkpointed) {
        throw new Error(
          'Safe reload requires a verified checkpoint.',
        )
      }
    } else if (
      status.phase !== 'blocked' &&
      status.phase !== 'ownership-lost'
    ) {
      throw new Error(
        `Safe reload is unavailable while the runtime is ${status.phase}.`,
      )
    }
    // There is intentionally no await between a non-ready status sample and
    // shutdown. The production runtime closes new startup, lifecycle, and
    // command admission synchronously when shutdown() is invoked.
    await runtime.shutdown()
  }
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
    saveSchemaVersion: unityFirstRunProvenance.saveSchema,
    sampleUtc: () =>
      lifecycleClock.sample().serializedUtcText,
    resetSave: () => {
      const importedAtUtc =
        lifecycleClock.sample().serializedUtcText
      const firstRun = createFirstRunSave()
      return runtime.importSave({
        source: 'paste',
        text: serializeWebSave(
          firstRun.copyValidatedState(),
        ),
        importedAtUtc,
        overwriteApproved: true,
      })
    },
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
      'idle-dyson-swarm:writer-ownership',
    )
  } catch {
    return undefined
  }
}
