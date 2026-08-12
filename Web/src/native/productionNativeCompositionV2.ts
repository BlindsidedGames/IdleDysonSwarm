import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { createV2GameRuntimeController } from '../inspection/v2GameRuntime'
import { BrowserLifecycleUtcClock } from '../platform/browserLifecycle'
import type { NativeHostEnvironment } from '../platform/nativeHostBridge'
import { NativeSingleHostWriterDatabase } from '../platform/nativeWriterLeaseDatabase'
import {
  CapacitorPlatformSaveStorageAdapter,
  ElectronPlatformSaveStorageAdapter,
  NATIVE_WEB_SAVE_PATHS,
} from '../platform/platformSaveStorage'
import { BrowserWriterLease } from '../platform/browserWriterLease'
import { Stage7V2CertificationHost } from '../certification/stage7V2/certificationHost'
import { Stage7V2NativeWriterLeaseManager } from '../certification/stage7V2/writerLease'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { RuntimeEntitlementBridge } from '../store/runtimeEntitlements'
import {
  ProductionV2SaveRepository,
  createProductionV2RepositoryPaths,
} from '../save/productionV2Repository'
import { ProductionV2RuntimeRepository } from '../save/productionV2RuntimeRepository'
import { serializeWebSave } from '../save/serialization'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeImportResult,
} from '../ui/runtime'
import type { AutomaticUnityPurchaseEvidencePromoter } from '../save/automaticPurchaseEvidence'

export interface ProductionNativeCompositionV2 {
  readonly hostKind: 'desktop-native' | 'mobile-native'
  readonly runtime: BrowserUiRuntimeFoundation
  readonly releasePlatformServices: NativeHostEnvironment['releasePlatformServices']
  readonly saveSchemaVersion: 13
  sampleUtc(): string
  resetSave(): Promise<UiRuntimeImportResult>
  prepareForSafeReload(): Promise<void>
  reloadSafely(): Promise<void>
}

export function createProductionNativeCompositionV2(
  environment: Readonly<NativeHostEnvironment>,
  reloadPage: () => void = () => window.location.reload(),
): Readonly<ProductionNativeCompositionV2> {
  const clock = new BrowserLifecycleUtcClock()
  const database = new NativeSingleHostWriterDatabase()
  const lease = new BrowserWriterLease({
    database,
    ownerToken: `native-v2-${environment.target}`,
    autoHeartbeat: true,
  })
  const storage = environment.target === 'electron'
    ? new ElectronPlatformSaveStorageAdapter(environment.files, environment.migration)
    : new CapacitorPlatformSaveStorageAdapter(environment.files, environment.migration)
  const repository = new ProductionV2SaveRepository(
    storage,
    createProductionV2RepositoryPaths(NATIVE_WEB_SAVE_PATHS),
    automaticPurchaseEvidencePromoter(
      environment.releasePlatformServices.entitlements,
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
  const hostWriter = new Stage7V2NativeWriterLeaseManager(`production-v2-${environment.target}-host`)
  const entitlementBridge = new RuntimeEntitlementBridge(
    environment.releasePlatformServices.entitlements,
  )
  const infinityRewardAuthority = () => issueInfinityRewardAuthorityV2ForApplication(
    Object.freeze({
      doubleInfinityPoints: entitlementBridge.currentOwnership().doubleInfinityPoints,
    }),
  )
  const controller = createV2GameRuntimeController({
    repository: runtimeRepository,
    beforeStart: async () => {
      const acquisition = await lease.acquire()
      if (!acquisition.acquired) throw new Error('The native V2 writer is already active.')
      await entitlementBridge.initialize()
    },
    afterShutdown: async () => { await lease.shutdown() },
    lifecycle: environment.lifecycle,
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
  environment.installTerminationCheckpoint?.(async () => {
    try {
      await prepareForSafeReload()
      return true
    } catch {
      return false
    }
  })
  return Object.freeze({
    hostKind: environment.target === 'electron' ? 'desktop-native' : 'mobile-native',
    runtime,
    releasePlatformServices: environment.releasePlatformServices,
    saveSchemaVersion: 13 as const,
    sampleUtc: () => clock.sample().serializedUtcText,
    resetSave: () => runtime.importSave(Object.freeze({
      source: 'paste' as const,
      text: serializeWebSave(createFirstRunSave().copyValidatedState()),
      importedAtUtc: clock.sample().serializedUtcText,
      overwriteApproved: true,
    })),
    prepareForSafeReload,
    reloadSafely: async () => {
      await prepareForSafeReload()
      reloadPage()
    },
  })
}

function automaticPurchaseEvidencePromoter(
  authority: NativeHostEnvironment['releasePlatformServices']['entitlements'],
): AutomaticUnityPurchaseEvidencePromoter | undefined {
  if (
    !('promoteAutomaticUnityPurchaseEvidence' in authority) ||
    typeof authority.promoteAutomaticUnityPurchaseEvidence !== 'function'
  ) return undefined
  return authority as typeof authority & AutomaticUnityPurchaseEvidencePromoter
}
