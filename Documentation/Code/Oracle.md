# Oracle

## Purpose
`Oracle` is the save-backed runtime root for DysonVerse. It owns top-level game state, persistence integration, migrations, and reset boundaries for Infinity/Quantum flows.

This document focuses on the reset and save-schema contracts relevant to offline-time usage tracking.

## Contract / Behavior Expectations
- `SaveDataSettings` now stores per-infinity offline usage counters (seconds):
  - `offlineTimeUsedThisInfinity`
  - `offlineTimeUsedPreviousInfinity`
- Infinity reset boundary behavior:
  - At the start of `DysonInfinity()` and `ManualDysonInfinity()`:
    - `offlineTimeUsedPreviousInfinity = offlineTimeUsedThisInfinity`
    - `offlineTimeUsedThisInfinity = 0`
- Quantum wipe behavior:
  - `PrestigeDoubleWiper()` clears both counters to `0`.

## Data Flow
- Counters are incremented by `OfflineTimeManager` when time is consumed.
- `Oracle` does not increment counters during spend; it only performs rollover/reset at reset boundaries.
- `GameManager` reads both counters to render side-panel run-info text.

## Save / Load Implications
- New counters are additive `double` fields in `SaveDataSettings`.
- Existing saves without these fields deserialize to default `0`, so no migration version bump is required.
- Export/import and canonical save persistence include these fields as part of the standard save payload.

## Compatibility Risks
- Moving rollover logic out of `DysonInfinity()`/`ManualDysonInfinity()` will desync “previous infinity” display semantics.
- Clearing only one counter in `PrestigeDoubleWiper()` creates stale values after quantum wipe.

## Quick Verification Steps
1. Spend offline time in a run and note `offlineTimeUsedThisInfinity`.
2. Trigger Infinity:
   - verify `this` resets to `0`,
   - verify `previous` equals prior run’s `this`.
3. Trigger quantum wipe path (`PrestigeDoubleWiper()`):
   - verify both counters reset to `0`.
