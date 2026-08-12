import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { BrowserLifecycleAdapter, BrowserLifecycleUtcClock } from '../platform/browserLifecycle'
import type { LifecycleAdapter } from '../platform/contracts'
import { createBrowserReloadWriterIdentity, type BrowserReloadWriterIdentity } from '../platform/browserReloadWriterIdentity'
import { IndexedDbBrowserSaveDatabase, type BrowserSaveDatabase } from '../platform/browserSaveDatabase'
import { BrowserWriterLease } from '../platform/browserWriterLease'
import { IndexedDbSaveStorageAdapter } from '../platform/indexedDbSaveStorage'
import {
  ProductionV2SaveRepository,
  createProductionV2RepositoryPaths,
} from '../save/productionV2Repository'
import { ProductionV2RuntimeRepository } from '../save/productionV2RuntimeRepository'
import { serializeWebSave } from '../save/serialization'
import {
  createV2GameRuntimeController,
} from '../inspection/v2GameRuntime'
import { Stage7V2CertificationHost } from '../certification/stage7V2/certificationHost'
import { Stage7V2NativeWriterLeaseManager } from '../certification/stage7V2/writerLease'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { RuntimeEntitlementBridge } from '../store/runtimeEntitlements'
import type { ReleasePlatformServices } from '../platform/releaseFoundation'
import type { AutomaticUnityPurchaseEvidencePromoter } from '../save/automaticPurchaseEvidence'
import {
  DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME,
  DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS,
  type BrowserUiRuntimeFoundation,
  type UiRuntimeImportResult,
} from '../ui/runtime'

export interface ProductionBrowserCompositionV2 {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly saveSchemaVersion: 13
  sampleUtc(): string
  resetSave(): Promise<UiRuntimeImportResult>
  prepareForUpdateActivation(): Promise<void>
  prepareForSafeReload(): Promise<void>
  reloadSafely(): Promise<void>
}

export interface ProductionBrowserCompositionV2Options {
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly reloadPage?: () => void
  readonly database?: Readonly<BrowserSaveDatabase>
  readonly lifecycle?: Readonly<LifecycleAdapter>
  readonly clock?: Readonly<{
    sample(): Readonly<{ utcMilliseconds: number; serializedUtcText: string }>
  }>
  readonly writerIdentity?: Readonly<BrowserReloadWriterIdentity>
}

/**
 * Coordinated browser V2 composition. It deliberately reuses the existing
 * IndexedDB database/profile paths so the repository can perform the one-way
 * schema-12 migration under the established writer lease.
 */
export function createProductionBrowserCompositionV2(
  options: Readonly<ProductionBrowserCompositionV2Options> = {},
): Readonly<ProductionBrowserCompositionV2> {
  const clock = options.clock ?? new BrowserLifecycleUtcClock()
  const lifecycle = options.lifecycle ?? new BrowserLifecycleAdapter()
  const database = options.database ?? new IndexedDbBrowserSaveDatabase(
    DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME,
  )
  const identity = options.writerIdentity ?? createBrowserReloadWriterIdentity()
  const lease = new BrowserWriterLease({
    database,
    ownerToken: identity.ownerToken,
    allowUnexpiredSameOwnerTakeover: identity.allowUnexpiredSameOwnerTakeover,
    autoHeartbeat: true,
  })
  const storage = new IndexedDbSaveStorageAdapter({
    database,
    lease,
  })
  const repository = new ProductionV2SaveRepository(
    storage,
    createProductionV2RepositoryPaths(DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS),
    automaticPurchaseEvidencePromoter(
      options.releasePlatformServices?.entitlements,
    ),
  )
  const createFirstRunSave = () => createUnityFirstRunPreparedSave({
    startedAtUtc: clock.sample().serializedUtcText,
  })
  const runtimeRepository = new ProductionV2RuntimeRepository({
    repository,
    nowUtc: () => clock.sample().serializedUtcText,
    createFirstRunSave,
  })
  const hostWriter = new Stage7V2NativeWriterLeaseManager('production-v2-browser-host')
  const entitlementBridge = options.releasePlatformServices === undefined
    ? null
    : new RuntimeEntitlementBridge(options.releasePlatformServices.entitlements)
  const infinityRewardAuthority = () => issueInfinityRewardAuthorityV2ForApplication(
    Object.freeze({
      doubleInfinityPoints:
        entitlementBridge?.currentOwnership().doubleInfinityPoints === true,
    }),
  )
  const controller = createV2GameRuntimeController({
    repository: runtimeRepository,
    beforeStart: async (takeover) => {
      const acquisition = takeover ? await lease.takeOver() : await lease.acquire()
      if (!acquisition.acquired) {
        throw new Error(
          `Another tab owns this game until ${new Date(acquisition.expiresAtUtcMilliseconds).toISOString()}.`,
        )
      }
      await entitlementBridge?.initialize()
    },
    afterShutdown: async () => { await lease.shutdown() },
    lifecycle,
    createStoredTimeHost: (publication, platform) => new Stage7V2CertificationHost({
      initialPublication: publication,
      platform,
      repository: runtimeRepository,
      writerLeases: hostWriter,
      infinityRewardAuthority: infinityRewardAuthority(),
      nowUtc: () => clock.sample().serializedUtcText,
    }),
    infinityRewardAuthority,
  })
  const runtime = controller.runtime
  const reloadPage = options.reloadPage ?? (() => window.location.reload())
  const prepareForSafeReload = async (): Promise<void> => {
    const status = runtime.status()
    if (status.phase === 'ready' && !(await runtime.checkpointBeforeSafeReload())) {
      throw new Error('Safe reload requires a verified schema-13 checkpoint.')
    }
    if (status.phase !== 'ready' && status.phase !== 'blocked' &&
      status.phase !== 'ownership-lost' && status.phase !== 'stopped') {
      throw new Error(`Safe reload is unavailable while the V2 runtime is ${status.phase}.`)
    }
    await runtime.shutdown()
  }
  return Object.freeze({
    runtime,
    releasePlatformServices: options.releasePlatformServices,
    saveSchemaVersion: 13 as const,
    sampleUtc: () => clock.sample().serializedUtcText,
    resetSave: () => runtime.importSave(Object.freeze({
      source: 'paste' as const,
      text: serializeWebSave(createFirstRunSave().copyValidatedState()),
      importedAtUtc: clock.sample().serializedUtcText,
      overwriteApproved: true,
    })),
    prepareForUpdateActivation: prepareForSafeReload,
    prepareForSafeReload,
    reloadSafely: async () => {
      await prepareForSafeReload()
      reloadPage()
    },
  })
}

function automaticPurchaseEvidencePromoter(
  authority: Readonly<ReleasePlatformServices>['entitlements'] | undefined,
): AutomaticUnityPurchaseEvidencePromoter | undefined {
  if (
    authority === undefined ||
    !('promoteAutomaticUnityPurchaseEvidence' in authority) ||
    typeof authority.promoteAutomaticUnityPurchaseEvidence !== 'function'
  ) return undefined
  return authority as typeof authority & AutomaticUnityPurchaseEvidencePromoter
}
