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
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeImportResult,
} from './ui/runtime'

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
}

export interface ProductionHostCompositionOptions {
  readonly detectNativeBridge?: () => NativeHostBridgeApi | null
  readonly createBrowserComposition?: () => ProductionBrowserComposition
  readonly createNativeComposition?: (
    bridge: NativeHostBridgeApi,
  ) => ProductionNativeComposition
}

/** Selects exactly one host graph before any persistence is opened. */
export function createProductionHostComposition(
  options: Readonly<ProductionHostCompositionOptions> = {},
): ProductionHostComposition {
  const bridge =
    (options.detectNativeBridge ?? detectNativeHostBridge)()
  if (bridge === null) {
    const composition =
      (options.createBrowserComposition ??
        createProductionBrowserComposition)()
    return Object.freeze({
      hostKind: 'browser' as const,
      runtime: composition.runtime,
      saveSchemaVersion: composition.saveSchemaVersion,
      pwaUpdatesAvailable: true,
      sampleUtc: composition.sampleUtc,
      resetSave: composition.resetSave,
      prepareForUpdateActivation:
        composition.prepareForUpdateActivation,
      prepareForSafeReload: composition.prepareForSafeReload,
      reloadSafely: composition.reloadSafely,
    })
  }
  const composition = options.createNativeComposition === undefined
    ? createProductionNativeComposition(
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
  })
}
