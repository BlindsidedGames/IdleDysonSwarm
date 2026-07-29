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
  readBrowserHostEntitlements,
  type BrowserEntitlementDocument,
} from '../platform/browserEntitlementAuthority'
import {
  MOBILE_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'
import {
  createBrowserRuntimeFoundation,
  type BrowserRuntimeFoundationOptions,
  type BrowserUiRuntimeFoundation,
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
}

export interface ProductionBrowserComposition {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly saveSchemaVersion: number
  sampleUtc(): string
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
  const createApplication =
    createProductionCanonicalApplicationFactory({
      createFirstRunSave: () =>
        createUnityFirstRunPreparedSave({
          startedAtUtc:
            lifecycleClock.sample().serializedUtcText,
        }),
      readHostEntitlements: () =>
        readBrowserHostEntitlements(entitlementDocument),
    })
  const runtimeFactory =
    options.createRuntime ?? createBrowserRuntimeFoundation
  const runtime = runtimeFactory({
    createApplication,
    lifecyclePolicy: MOBILE_LIFECYCLE_POLICY,
    allowedExternalOrigins: [],
    lifecycleClock,
    activeTimeClock: monotonicClock,
    nowUtcMilliseconds: () =>
      lifecycleClock.sample().utcMilliseconds,
  })
  const reloadPage =
    options.reloadPage ?? (() => window.location.reload())
  return Object.freeze({
    runtime,
    saveSchemaVersion: unityFirstRunProvenance.saveSchema,
    sampleUtc: () =>
      lifecycleClock.sample().serializedUtcText,
    reloadSafely: async () => {
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
      reloadPage()
    },
  })
}
