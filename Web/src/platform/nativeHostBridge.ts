import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core'
import type {
  AutomaticUnityPurchaseEvidence,
  AutomaticUnityPurchaseEvidencePromoter,
  AutomaticSameDeviceUnityCandidateProvenance,
} from '../save/automaticPurchaseEvidence'
import type { LegacySaveCandidate } from '../save/repository'
import {
  CANONICAL_STORE_PRODUCTS,
  type EntitlementAuthority,
  type HostEntitlementOwnership,
  type StoreAdapter,
  type StoreProductId,
  type StoreProductListing,
  type StorePurchaseResult,
  type StoreRestoreResult,
} from '../store/contracts'
import type { LifecyclePhase, RuntimeTarget } from './contracts'
import {
  NativeDiagnosticsExporter,
  NativeLifecycleAdapter,
  NativePlatformMetadataSource,
  type NativeApplicationMetadata,
  type NativeDiagnosticsFileRequest,
} from './nativeSystemPorts'
import type {
  DiagnosticsExportResult,
  ReleasePlatformServices,
} from './releaseFoundation'
import type {
  NativeMigrationSource,
  RootedNativeFileBridge,
} from './platformSaveStorage'

export interface NativeUnitySaveCandidate {
  readonly id: string
  readonly text: string
  readonly provenance: Readonly<
    AutomaticSameDeviceUnityCandidateProvenance
  >
}

export interface NativeHostBridgeApi {
  readonly target: Exclude<RuntimeTarget, 'browser'>
  exists(relativePath: string): Promise<boolean>
  readText(relativePath: string): Promise<string>
  writeText(relativePath: string, contents: string): Promise<void>
  replaceAtomically(
    temporaryRelativePath: string,
    destinationRelativePath: string,
  ): Promise<void>
  copy(
    sourceRelativePath: string,
    destinationRelativePath: string,
  ): Promise<void>
  readonly removeCertificationFiles?: (
    relativePaths: readonly string[],
  ) => Promise<void>
  discoverUnitySaves(): Promise<readonly NativeUnitySaveCandidate[]>
  currentLifecyclePhase(): LifecyclePhase
  subscribeLifecycle(
    listener: (phase: LifecyclePhase) => void,
  ): () => void
  readonly installTerminationCheckpoint?: (
    handler: () => Promise<boolean>,
  ) => () => void
  metadata(): Promise<Readonly<NativeApplicationMetadata>>
  readonly certificationDeviceContext?: () => Promise<Readonly<NativeCertificationDeviceContext>>
  exportDiagnostics(
    request: Readonly<NativeDiagnosticsFileRequest>,
  ): Promise<DiagnosticsExportResult>
  storeProducts(): Promise<readonly StoreProductListing[]>
  storePurchase(productId: StoreProductId): Promise<StorePurchaseResult>
  storeRestorePurchases(): Promise<StoreRestoreResult>
  readEntitlements(
    refresh: boolean,
  ): Promise<Readonly<HostEntitlementOwnership>>
  readonly promoteAutomaticUnityPurchaseEvidence?: (
    evidence: Readonly<AutomaticUnityPurchaseEvidence>,
  ) => Promise<void>
}

export interface NativeCertificationDeviceContext {
  readonly matrixId: 'android-api26-emulator' | 'android-api36-emulator' | 'ios-current-simulator'
  readonly physicalDevice: boolean
  readonly osApiLevel: number | null
  readonly deviceModel: string
  readonly osVersion: string
  readonly applicationVersion: string
  readonly buildNumber: string
}

declare global {
  interface Window {
    idleDysonSwarmNativeHost?: NativeHostBridgeApi
  }
}

interface CapacitorNativeHostPlugin {
  fileExists(request: { relativePath: string }): Promise<{ exists: boolean }>
  readText(request: { relativePath: string }): Promise<{ text: string }>
  writeText(request: {
    relativePath: string
    contents: string
  }): Promise<void>
  replaceAtomically(request: {
    temporaryRelativePath: string
    destinationRelativePath: string
  }): Promise<void>
  copy(request: {
    sourceRelativePath: string
    destinationRelativePath: string
  }): Promise<void>
  removeCertificationFiles(request: {
    relativePaths: readonly string[]
  }): Promise<void>
  discoverUnitySaveCandidates(): Promise<{
    candidates: readonly NativeUnitySaveCandidate[]
  }>
  currentLifecycle(): Promise<{ phase: LifecyclePhase }>
  metadata(): Promise<NativeApplicationMetadata>
  certificationDeviceContext(): Promise<NativeCertificationDeviceContext>
  exportDiagnostics(
    request: NativeDiagnosticsFileRequest,
  ): Promise<DiagnosticsExportResult>
  getStoreProducts(): Promise<{
    listings: readonly StoreProductListing[]
  }>
  purchaseStoreProduct(request: {
    productId: StoreProductId
  }): Promise<StorePurchaseResult>
  restoreStorePurchases(): Promise<StoreRestoreResult>
  readEntitlementOwnership(): Promise<HostEntitlementOwnership>
  refreshEntitlementOwnership(): Promise<HostEntitlementOwnership>
  promoteAutomaticUnityPurchaseEvidence(
    evidence: Readonly<AutomaticUnityPurchaseEvidence>,
  ): Promise<{ promoted: boolean }>
  addListener(
    eventName: 'lifecycleChanged',
    listener: (event: { phase: LifecyclePhase }) => void,
  ): Promise<PluginListenerHandle>
}

const capacitorPlugin = registerPlugin<CapacitorNativeHostPlugin>(
  'IdleDysonNative',
)

export function detectNativeHostBridge(): NativeHostBridgeApi | null {
  if (window.idleDysonSwarmNativeHost !== undefined) {
    return window.idleDysonSwarmNativeHost
  }
  if (!Capacitor.isNativePlatform()) return null
  const platform = Capacitor.getPlatform()
  if (platform !== 'android' && platform !== 'ios') {
    throw new Error(`Unsupported Capacitor platform: ${platform}.`)
  }
  return new CapacitorNativeHostBridge(platform, capacitorPlugin)
}

export interface NativeHostEnvironment {
  readonly target: Exclude<RuntimeTarget, 'browser'>
  readonly files: RootedNativeFileBridge
  readonly migration: NativeMigrationSource
  readonly lifecycle: NativeLifecycleAdapter
  readonly installTerminationCheckpoint?: (
    handler: () => Promise<boolean>,
  ) => () => void
  readonly releasePlatformServices: Readonly<ReleasePlatformServices>
}

export function createNativeHostEnvironment(
  bridge: NativeHostBridgeApi,
): Readonly<NativeHostEnvironment> {
  const hostKind = bridge.target === 'electron'
    ? 'desktop-native'
    : 'mobile-native'
  const store = new NativeBridgeStoreAdapter(bridge)
  const entitlements = new NativeBridgeEntitlementAuthority(bridge)
  const migration = new NativeBridgeMigrationSource(bridge)
  const diagnostics = new NativeDiagnosticsExporter({
    exportText: (request) => bridge.exportDiagnostics(request),
  })
  const releasePlatformServices = Object.freeze({
    hostKind,
    metadata: new NativePlatformMetadataSource(hostKind, bridge),
    nativeFilesystemMigration: migration,
    entitlements,
    store,
    diagnostics,
  }) satisfies Readonly<ReleasePlatformServices>
  return Object.freeze({
    target: bridge.target,
    files: bridge,
    migration,
    lifecycle: new NativeLifecycleAdapter({
      currentPhase: () => bridge.currentLifecyclePhase(),
      subscribe: (listener) => bridge.subscribeLifecycle(listener),
    }),
    ...(bridge.installTerminationCheckpoint === undefined
      ? {}
      : {
          installTerminationCheckpoint:
            bridge.installTerminationCheckpoint.bind(bridge),
        }),
    releasePlatformServices,
  })
}

class NativeBridgeMigrationSource implements NativeMigrationSource {
  private readonly bridge: NativeHostBridgeApi

  constructor(bridge: NativeHostBridgeApi) {
    this.bridge = bridge
  }

  async discoverCandidates(): Promise<readonly LegacySaveCandidate[]> {
    const candidates = await this.bridge.discoverUnitySaves()
    return Object.freeze(candidates.map((candidate) => Object.freeze({
      id: candidate.id,
      sourcePath: `unity-readonly:${candidate.id}`,
      text: candidate.text,
      provenance: Object.freeze({ ...candidate.provenance }),
    })))
  }
}

class NativeBridgeStoreAdapter implements StoreAdapter {
  private readonly bridge: NativeHostBridgeApi

  constructor(bridge: NativeHostBridgeApi) {
    this.bridge = bridge
  }

  async products(): Promise<readonly StoreProductListing[]> {
    const listings = await this.bridge.storeProducts()
    const byId = new Map(listings.map((listing) => [
      listing.productId,
      listing,
    ]))
    return Object.freeze(CANONICAL_STORE_PRODUCTS.map((product) => {
      const listing = byId.get(product.id)
      return Object.freeze({
        productId: product.id,
        localizedPrice:
          listing?.localizedPrice ?? null,
        available:
          listing?.available === true &&
          typeof listing.localizedPrice === 'string' &&
          listing.localizedPrice.trim() !== '',
      })
    }))
  }

  purchase(productId: StoreProductId): Promise<StorePurchaseResult> {
    return this.bridge.storePurchase(productId)
  }

  restorePurchases(): Promise<StoreRestoreResult> {
    return this.bridge.storeRestorePurchases()
  }
}

class NativeBridgeEntitlementAuthority implements EntitlementAuthority {
  private readonly bridge: NativeHostBridgeApi
  readonly promoteAutomaticUnityPurchaseEvidence?:
    AutomaticUnityPurchaseEvidencePromoter[
      'promoteAutomaticUnityPurchaseEvidence'
    ]

  constructor(bridge: NativeHostBridgeApi) {
    this.bridge = bridge
    if (bridge.promoteAutomaticUnityPurchaseEvidence !== undefined) {
      this.promoteAutomaticUnityPurchaseEvidence = (evidence) =>
        bridge.promoteAutomaticUnityPurchaseEvidence?.(evidence) ??
        Promise.resolve()
    }
  }

  readOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.bridge.readEntitlements(false)
  }

  refreshOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.bridge.readEntitlements(true)
  }
}

class CapacitorNativeHostBridge implements NativeHostBridgeApi {
  readonly target: 'android' | 'ios'
  private readonly plugin: CapacitorNativeHostPlugin
  private phase: LifecyclePhase = 'active'

  constructor(
    target: 'android' | 'ios',
    plugin: CapacitorNativeHostPlugin,
  ) {
    this.target = target
    this.plugin = plugin
    void plugin.currentLifecycle().then(({ phase }) => {
      if (isLifecyclePhase(phase)) this.phase = phase
    }).catch(() => undefined)
  }

  async exists(relativePath: string): Promise<boolean> {
    return (await this.plugin.fileExists({ relativePath })).exists
  }

  async readText(relativePath: string): Promise<string> {
    return (await this.plugin.readText({ relativePath })).text
  }

  writeText(relativePath: string, contents: string): Promise<void> {
    return this.plugin.writeText({ relativePath, contents })
  }

  replaceAtomically(
    temporaryRelativePath: string,
    destinationRelativePath: string,
  ): Promise<void> {
    return this.plugin.replaceAtomically({
      temporaryRelativePath,
      destinationRelativePath,
    })
  }

  copy(
    sourceRelativePath: string,
    destinationRelativePath: string,
  ): Promise<void> {
    return this.plugin.copy({
      sourceRelativePath,
      destinationRelativePath,
    })
  }

  removeCertificationFiles(relativePaths: readonly string[]): Promise<void> {
    return this.plugin.removeCertificationFiles({ relativePaths })
  }

  async discoverUnitySaves(): Promise<readonly NativeUnitySaveCandidate[]> {
    return (await this.plugin.discoverUnitySaveCandidates()).candidates
  }

  currentLifecyclePhase(): LifecyclePhase {
    return this.phase
  }

  subscribeLifecycle(
    listener: (phase: LifecyclePhase) => void,
  ): () => void {
    let active = true
    let handle: PluginListenerHandle | undefined
    void this.plugin.addListener(
      'lifecycleChanged',
      ({ phase }) => {
        if (!active || !isLifecyclePhase(phase)) return
        this.phase = phase
        listener(phase)
      },
    ).then((registered) => {
      if (active) handle = registered
      else void registered.remove()
    })
    return () => {
      active = false
      void handle?.remove()
    }
  }

  metadata(): Promise<Readonly<NativeApplicationMetadata>> {
    return this.plugin.metadata()
  }

  certificationDeviceContext(): Promise<Readonly<NativeCertificationDeviceContext>> {
    return this.plugin.certificationDeviceContext()
  }

  exportDiagnostics(
    request: Readonly<NativeDiagnosticsFileRequest>,
  ): Promise<DiagnosticsExportResult> {
    return this.plugin.exportDiagnostics(request)
  }

  async storeProducts(): Promise<readonly StoreProductListing[]> {
    return (await this.plugin.getStoreProducts()).listings
  }

  storePurchase(productId: StoreProductId): Promise<StorePurchaseResult> {
    return this.plugin.purchaseStoreProduct({ productId })
  }

  storeRestorePurchases(): Promise<StoreRestoreResult> {
    return this.plugin.restoreStorePurchases()
  }

  readEntitlements(
    refresh: boolean,
  ): Promise<Readonly<HostEntitlementOwnership>> {
    return refresh
      ? this.plugin.refreshEntitlementOwnership()
      : this.plugin.readEntitlementOwnership()
  }

  async promoteAutomaticUnityPurchaseEvidence(
    evidence: Readonly<AutomaticUnityPurchaseEvidence>,
  ): Promise<void> {
    await this.plugin.promoteAutomaticUnityPurchaseEvidence(evidence)
  }
}

function isLifecyclePhase(value: string): value is LifecyclePhase {
  return value === 'active' ||
    value === 'background' ||
    value === 'focus-lost' ||
    value === 'terminating'
}
