import type { ModeSaveActions } from '../ui/gameplay/settings/modeSaveActions'
import type { BrowserRuntimeFoundationOptions } from '../ui/runtime'

/** Host-local adapters require explicit lifecycle receipts and clocks. In
 * particular, omission must never fall back to the shared localStorage marker. */
export type ModeRuntimeHostOptions = Required<Pick<BrowserRuntimeFoundationOptions,
  'lifecycle' | 'lifecycleClock' | 'lifecyclePolicy' | 'activeTimeClock' |
  'activeTimeScheduler' | 'nowUtcMilliseconds' | 'departureMarker'>> &
  Partial<Pick<BrowserRuntimeFoundationOptions, 'frontendSnapshotScheduler' | 'checkpointScheduler' | 'hostEntitlements' | 'allowedExternalOrigins' | 'developmentControlsAvailable' | 'developmentControlsRequireEntitlement'>> & { readonly saveActions?: ModeSaveActions
    readonly services?: Readonly<import('../platform/releaseFoundation').ReleasePlatformServices>
    readonly hostKind?: import('../platform/releaseFoundation').HostKind
    readonly releaseFooter?: import('../platform/releaseFooter').ReleaseFooterPresentation
    readonly reloadSafely?: () => Promise<void>
    readonly audio?: import('../audio').GameAudioService
    readonly native?: import('../platform/nativeHostBridge').NativeHostBridgeApi
  }
