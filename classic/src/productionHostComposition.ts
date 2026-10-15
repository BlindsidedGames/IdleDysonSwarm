import {
  createProductionBrowserComposition,
  type ProductionBrowserComposition,
} from './browser/productionBrowserComposition'
import {
  createProductionNativeComposition,
  type ProductionNativeComposition,
} from './native/productionNativeComposition'
import {
  createNativeHostEnvironment,
  detectNativeHostBridge,
  type NativeHostBridgeApi,
} from './platform/nativeHostBridge'
import type { HostKind, ReleasePlatformServices } from './platform/releaseFoundation'
import {
  createBrowserDevelopmentReleasePlatformServices,
  createBrowserStripeReleasePlatformServices,
} from './platform/releaseFoundation'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeImportResult,
} from './ui/runtime'
import { selectBrowserStoreAdapterKind } from './store/developmentStoreSelection'
import { BrowserLifecycleAdapter } from './platform/browserLifecycle'
import {
  createProductionAudioService,
  type GameAudioService,
} from './audio'
import type { AutomaticUnityNumberFormattingAdopter } from './save/repository'

export interface ProductionHostComposition {
  readonly hostKind: HostKind
  readonly runtime: BrowserUiRuntimeFoundation
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly saveSchemaVersion: number
  readonly pwaUpdatesAvailable: boolean
  readonly audio: GameAudioService
  sampleUtc(): string
  resetSave(): Promise<UiRuntimeImportResult>
  prepareForUpdateActivation(): Promise<void>
  prepareForSafeReload(): Promise<void>
  reloadSafely(): Promise<void>
}

export interface ProductionHostCompositionOptions {
  readonly detectNativeBridge?: () => NativeHostBridgeApi | null
  readonly createBrowserComposition?: () => ProductionBrowserComposition
  readonly createNativeComposition?: (
    bridge: NativeHostBridgeApi,
  ) => ProductionNativeComposition
  readonly automaticNumberFormattingAdopter?:
    AutomaticUnityNumberFormattingAdopter
  readonly automaticResearchVisibilityAdopter?:
    import('./save/repository').AutomaticUnityResearchVisibilityAdopter
}

function createConfiguredBrowserStoreServices(): Readonly<ReleasePlatformServices> {
  const storeKind = import.meta.env.DEV
    ? selectBrowserStoreAdapterKind({
        developmentBuild: true,
        mode: import.meta.env.MODE,
      })
    : 'stripe'
  return storeKind === 'development'
    ? createBrowserDevelopmentReleasePlatformServices()
    : createBrowserStripeReleasePlatformServices()
}

/** Selects exactly one host graph before any persistence is opened. */
export function createProductionHostComposition(
  options: Readonly<ProductionHostCompositionOptions> = {},
): ProductionHostComposition {
  const bridge =
    (options.detectNativeBridge ?? detectNativeHostBridge)()
  if (bridge === null) {
    const audio = createProductionAudioService(
      'browser',
      new BrowserLifecycleAdapter(),
    )
    const composition = options.createBrowserComposition === undefined
      ? (() => {
          const services = createConfiguredBrowserStoreServices()
          return createProductionBrowserComposition({
            releasePlatformServices: services,
            automaticNumberFormattingAdopter:
              options.automaticNumberFormattingAdopter,
            automaticResearchVisibilityAdopter:
              options.automaticResearchVisibilityAdopter,
          })
        })()
      : options.createBrowserComposition()
    return Object.freeze({
      hostKind: 'browser' as const,
      runtime: composition.runtime,
      releasePlatformServices: composition.releasePlatformServices,
      saveSchemaVersion: composition.saveSchemaVersion,
      pwaUpdatesAvailable: true,
      audio,
      sampleUtc: composition.sampleUtc,
      resetSave: composition.resetSave,
      prepareForUpdateActivation:
        composition.prepareForUpdateActivation,
      prepareForSafeReload: composition.prepareForSafeReload,
      reloadSafely: composition.reloadSafely,
    })
  }
  const environment = createNativeHostEnvironment(bridge)
  const composition = options.createNativeComposition === undefined
    ? createProductionNativeComposition(environment, {
        automaticNumberFormattingAdopter:
          options.automaticNumberFormattingAdopter,
        automaticResearchVisibilityAdopter:
          options.automaticResearchVisibilityAdopter,
      })
    : options.createNativeComposition(bridge)
  return Object.freeze({
    hostKind: composition.hostKind,
    runtime: composition.runtime,
    releasePlatformServices:
      composition.releasePlatformServices,
    saveSchemaVersion: composition.saveSchemaVersion,
    pwaUpdatesAvailable: false,
    audio: createProductionAudioService(bridge.target, environment.lifecycle),
    sampleUtc: composition.sampleUtc,
    resetSave: composition.resetSave,
    prepareForUpdateActivation:
      composition.prepareForSafeReload,
    prepareForSafeReload: composition.prepareForSafeReload,
    reloadSafely: composition.reloadSafely,
  })
}
