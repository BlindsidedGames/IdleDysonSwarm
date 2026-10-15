import type { ModeSaveActions } from '../ui/gameplay/settings/modeSaveActions'
import type { BrowserRuntimeFoundationOptions } from '../ui/runtime'

/** Host-local adapters require explicit lifecycle receipts and clocks. In
 * particular, omission must never fall back to the shared localStorage marker. */
export type ModeRuntimeHostOptions = Required<Pick<BrowserRuntimeFoundationOptions,
  'lifecycle' | 'lifecycleClock' | 'lifecyclePolicy' | 'activeTimeClock' |
  'activeTimeScheduler' | 'nowUtcMilliseconds' | 'departureMarker'>> &
  Pick<BrowserRuntimeFoundationOptions, 'frontendSnapshotScheduler' | 'checkpointScheduler'> & { readonly saveActions?: ModeSaveActions }
