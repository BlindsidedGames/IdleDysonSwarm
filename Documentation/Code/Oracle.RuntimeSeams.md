# Oracle.RuntimeSeams

## Contract / behavior expectations
- `EnsureRuntimeSeamsInitialized()` must provide non-null defaults for:
  - `IClock` (`SystemClock`)
  - `ISaveStore` (`CanonicalSaveStore.CreateDefault()`)
  - `OfflineAwayTimeCalculator`
  - `ManualLifecycleEvents` + `OfflineLifecycleCoordinator`
- Oracle lifecycle callbacks must only raise lifecycle events; policy routing lives in `OfflineLifecycleCoordinator`.
- Focus-loss save requests are mobile-only (`iOS`/`Android` player builds). Desktop focus loss must not route to `SaveForQuit()`.
- Save requests are routed with `LifecycleSaveTrigger` and flow through `SaveForLifecycleTrigger(...)` so readiness guards and quit-time policy stay centralized.

## Data flow
1. `Oracle.Awake()` calls `EnsureRuntimeSeamsInitialized()`.
2. Unity lifecycle callback fires (`OnApplicationQuit`, `OnApplicationPause`, `OnApplicationFocus`).
3. Callback raises `ManualLifecycleEvents`.
4. `OfflineLifecycleCoordinator` maps event to:
   - `OnLifecycleSaveRequested(trigger)` -> `SaveForLifecycleTrigger(trigger)` for quit, mobile pause, and mobile focus-loss.
   - `OnLifecycleReloadRequested()` -> `Load()` (mobile focus gain policy only)
5. `Oracle.Persistence` uses initialized seams for timestamping (`IClock`) and canonical persistence (`ISaveStore`).

## Save/load implications
- `IClock` controls all seam-backed quit/load timestamps used by offline-time diagnostics.
- Replacing `ISaveStore` in tests changes where canonical snapshots are read/written but keeps Oracle behavior unchanged.

## Performance pitfalls
- `Load()` on focus gain is intentionally gated by platform (`!UNITY_EDITOR && (UNITY_IOS || UNITY_ANDROID)`) to avoid expensive reload loops on desktop/editor.
- Focus-loss save policy is also platform-gated to mobile so desktop alt-tab does not overwrite quit timestamps used for offline-time grants.
- Do not allocate/rebuild coordinators repeatedly during normal gameplay; wiring is expected once per Oracle lifetime.

## Quick verification steps
1. Run `OfflineLifecycleCoordinatorTests` to validate event routing matrix.
2. Run `OfflineAwayTimeCalculatorTests` to validate timestamp source/clamp behavior.
3. Run `OfflinePersistenceRegressionTests` to validate close/open persistence + offline grant matrix.
