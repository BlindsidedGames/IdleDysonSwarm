import type {
  ProductionBrowserComposition,
} from './browser/productionBrowserComposition'
import {
  createProductionBrowserCompositionV2,
  type ProductionBrowserCompositionV2,
} from './browser/productionBrowserCompositionV2'
import type {
  ProductionNativeComposition,
} from './native/productionNativeComposition'
import {
  createProductionNativeCompositionV2,
  type ProductionNativeCompositionV2,
} from './native/productionNativeCompositionV2'
import {
  createNativeHostEnvironment,
  detectNativeHostBridge,
  type NativeHostBridgeApi,
} from './platform/nativeHostBridge'
import type { HostKind, ReleasePlatformServices } from './platform/releaseFoundation'
import { createBrowserStripeReleasePlatformServices } from './platform/releaseFoundation'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeImportResult,
} from './ui/runtime'
import type {
  Stage7V2WorkerLauncherAccessResult,
} from './certification/stage7V2/access'
import { createStage7V2WorkerLauncherOnDemand } from './certification/stage7V2/access'

export interface ProductionHostComposition {
  readonly hostKind: HostKind
  readonly runtime: BrowserUiRuntimeFoundation
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly saveSchemaVersion: number
  readonly pwaUpdatesAvailable: boolean
  sampleUtc(): string
  resetSave(): Promise<UiRuntimeImportResult>
  prepareForUpdateActivation(): Promise<void>
  prepareForSafeReload(): Promise<void>
  reloadSafely(): Promise<void>
  createStage7V2WorkerLauncher(): Promise<Stage7V2WorkerLauncherAccessResult>
}

export interface ProductionHostCompositionOptions {
  readonly detectNativeBridge?: () => NativeHostBridgeApi | null
  readonly createBrowserComposition?: () =>
    | ProductionBrowserComposition
    | ProductionBrowserCompositionV2
  readonly createNativeComposition?: (
    bridge: NativeHostBridgeApi,
  ) => ProductionNativeComposition | ProductionNativeCompositionV2
}

/** Selects exactly one host graph before any persistence is opened. */
export function createProductionHostComposition(
  options: Readonly<ProductionHostCompositionOptions> = {},
): ProductionHostComposition {
  const bridge =
    (options.detectNativeBridge ?? detectNativeHostBridge)()
  if (bridge === null) {
    const composition = options.createBrowserComposition === undefined
      ? (() => {
          const services = createBrowserStripeReleasePlatformServices()
          return createProductionBrowserCompositionV2({
            releasePlatformServices: services,
          })
        })()
      : options.createBrowserComposition()
    return Object.freeze({
      hostKind: 'browser' as const,
      runtime: composition.runtime,
      releasePlatformServices: composition.releasePlatformServices,
      saveSchemaVersion: composition.saveSchemaVersion,
      pwaUpdatesAvailable: true,
      sampleUtc: composition.sampleUtc,
      resetSave: composition.resetSave,
      prepareForUpdateActivation:
        composition.prepareForUpdateActivation,
      prepareForSafeReload: composition.prepareForSafeReload,
      reloadSafely: composition.reloadSafely,
      createStage7V2WorkerLauncher: createStage7V2WorkerLauncherOnDemand,
    })
  }
  const composition = options.createNativeComposition === undefined
    ? createProductionNativeCompositionV2(
        createNativeHostEnvironment(bridge),
      )
    : options.createNativeComposition(bridge)
  return Object.freeze({
    hostKind: composition.hostKind,
    runtime: composition.runtime,
    releasePlatformServices:
      composition.releasePlatformServices,
    saveSchemaVersion: composition.saveSchemaVersion,
    pwaUpdatesAvailable: false,
    sampleUtc: composition.sampleUtc,
    resetSave: composition.resetSave,
    prepareForUpdateActivation:
      composition.prepareForSafeReload,
    prepareForSafeReload: composition.prepareForSafeReload,
    reloadSafely: composition.reloadSafely,
    createStage7V2WorkerLauncher: createStage7V2WorkerLauncherOnDemand,
  })
}
