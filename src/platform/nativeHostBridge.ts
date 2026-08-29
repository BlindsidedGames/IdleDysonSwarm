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
import { DoubleInfinityPointsEffectPreferenceService } from '../store/doubleInfinityPointsEffect'
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
  /** Resolves after native lifecycle events are subscribed and reconciled. */
  readonly ready?: () => Promise<void>
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
  discoverUnitySaves(): Promise<readonly NativeUnitySaveCandidate[]>
  currentLifecyclePhase(): LifecyclePhase
  subscribeLifecycle(
    listener: (phase: LifecyclePhase) => void,
  ): () => void
  readonly installTerminationCheckpoint?: (
    handler: () => Promise<boolean>,
  ) => () => void
  metadata(): Promise<Readonly<NativeApplicationMetadata>>
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
  readonly requestStoreReview?: () => Promise<NativeReviewRequestResult>
}

export interface NativeReviewRequestResult {
  readonly requested: boolean
  readonly reason: 'requested' | 'already-requested'
}

declare global {
  interface Window {
    idleDysonSwarmNativeHost?: NativeHostBridgeApi
  }
}

export interface NativeSystemInsets {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface CapacitorNativeHostPlugin {
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
  discoverUnitySaveCandidates(): Promise<{
    candidates: readonly NativeUnitySaveCandidate[]
  }>
  currentLifecycle(): Promise<{ phase: LifecyclePhase }>
  metadata(): Promise<NativeApplicationMetadata>
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
  requestStoreReview(): Promise<NativeReviewRequestResult>
  systemInsets(): Promise<NativeSystemInsets>
  addListener(
    eventName: 'lifecycleChanged',
    listener: (event: { phase: LifecyclePhase }) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'systemInsetsChanged',
    listener: (event: NativeSystemInsets) => void,
  ): Promise<PluginListenerHandle>
}

const capacitorPlugin = registerPlugin<CapacitorNativeHostPlugin>(
  'IdleDysonNative',
)

export interface NativeSafeAreaPlugin {
  systemInsets(): Promise<NativeSystemInsets>
  addListener(
    eventName: 'systemInsetsChanged',
    listener: (event: NativeSystemInsets) => void,
  ): Promise<PluginListenerHandle>
}

export interface NativeSafeAreaInstallerOptions {
  readonly root?: HTMLElement
  readonly isNativePlatform?: boolean
  readonly platform?: string
  readonly plugin?: NativeSafeAreaPlugin
}

export async function installNativeSafeAreaInsets(
  options: Readonly<NativeSafeAreaInstallerOptions> = {},
): Promise<() => void> {
  const isNativePlatform = options.isNativePlatform ??
    Capacitor.isNativePlatform()
  const platform = options.platform ?? Capacitor.getPlatform()
  if (!isNativePlatform || platform !== 'android') return () => undefined

  const root = options.root ?? document.documentElement
  const plugin = options.plugin ?? capacitorPlugin
  let active = true
  let handle: PluginListenerHandle | undefined
  const apply = (insets: NativeSystemInsets): void => {
    if (!active) return
    setNativeSafeAreaProperty(root, 'top', insets.top)
    setNativeSafeAreaProperty(root, 'right', insets.right)
    setNativeSafeAreaProperty(root, 'bottom', insets.bottom)
    setNativeSafeAreaProperty(root, 'left', insets.left)
  }

  try {
    handle = await plugin.addListener('systemInsetsChanged', apply)
    apply(await plugin.systemInsets())
  } catch {
    active = false
    await handle?.remove().catch(() => undefined)
    return () => undefined
  }

  return () => {
    active = false
    void handle?.remove()
  }
}

function setNativeSafeAreaProperty(
  root: HTMLElement,
  side: 'top' | 'right' | 'bottom' | 'left',
  value: number,
): void {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 2048)
    : 0
  root.style.setProperty(`--android-safe-area-${side}`, `${safeValue}px`)
}

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
    doubleInfinityPointsEffect:
      new DoubleInfinityPointsEffectPreferenceService(),
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

  async readOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return normalizeHostOwnership(await this.bridge.readEntitlements(false))
  }

  async refreshOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return normalizeHostOwnership(await this.bridge.readEntitlements(true))
  }
}

function normalizeHostOwnership(
  ownership: Partial<HostEntitlementOwnership> | null | undefined,
): Readonly<HostEntitlementOwnership> {
  return Object.freeze({
    doubleInfinityPoints: ownership?.doubleInfinityPoints === true,
    developerOptions: ownership?.developerOptions === true,
    supporterCatGallery: ownership?.supporterCatGallery === true,
  })
}

export class CapacitorNativeHostBridge implements NativeHostBridgeApi {
  readonly target: 'android' | 'ios'
  private readonly plugin: CapacitorNativeHostPlugin
  // Stay conservatively suspended until a subscribed event or the reconciled
  // current-state query proves the WebView is active.
  private phase: LifecyclePhase = 'background'
  private phaseEpoch = 0
  private readonly lifecycleListeners =
    new Set<(phase: LifecyclePhase) => void>()
  private readonly lifecycleReady: Promise<void>

  constructor(
    target: 'android' | 'ios',
    plugin: CapacitorNativeHostPlugin,
  ) {
    this.target = target
    this.plugin = plugin
    this.lifecycleReady = this.initializeLifecycle()
  }

  ready(): Promise<void> {
    return this.lifecycleReady
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

  async discoverUnitySaves(): Promise<readonly NativeUnitySaveCandidate[]> {
    return (await this.plugin.discoverUnitySaveCandidates()).candidates
  }

  currentLifecyclePhase(): LifecyclePhase {
    return this.phase
  }

  subscribeLifecycle(
    listener: (phase: LifecyclePhase) => void,
  ): () => void {
    this.lifecycleListeners.add(listener)
    return () => {
      this.lifecycleListeners.delete(listener)
    }
  }

  private async initializeLifecycle(): Promise<void> {
    try {
      await this.plugin.addListener(
        'lifecycleChanged',
        ({ phase }) => this.applyLifecycleEvent(phase),
      )
    } catch {
      // Still query the current state. Without an event stream, the bridge
      // remains conservatively backgrounded if reconciliation also fails.
    }
    const queryEpoch = this.phaseEpoch
    try {
      const { phase } = await this.plugin.currentLifecycle()
      if (
        queryEpoch === this.phaseEpoch &&
        isLifecyclePhase(phase)
      ) {
        this.publishReconciledLifecycle(phase)
      }
    } catch {
      // The subscribed event stream remains authoritative if the one-time
      // current-state query is unavailable.
    }
  }

  private applyLifecycleEvent(phase: LifecyclePhase): void {
    if (!isLifecyclePhase(phase)) return
    this.phaseEpoch += 1
    this.publishReconciledLifecycle(phase)
  }

  private publishReconciledLifecycle(phase: LifecyclePhase): void {
    if (phase === this.phase) return
    this.phase = phase
    for (const listener of [...this.lifecycleListeners]) {
      try {
        listener(phase)
      } catch {
        // A renderer listener cannot suppress native lifecycle delivery.
      }
    }
  }

  metadata(): Promise<Readonly<NativeApplicationMetadata>> {
    return this.plugin.metadata()
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

  requestStoreReview(): Promise<NativeReviewRequestResult> {
    return this.plugin.requestStoreReview()
  }
}

function isLifecyclePhase(value: string): value is LifecyclePhase {
  return value === 'active' ||
    value === 'background' ||
    value === 'focus-lost' ||
    value === 'terminating'
}
