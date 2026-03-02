# Oracle

## Purpose
`Oracle` is the save-backed runtime root for DysonVerse. It owns top-level game state, persistence integration, migrations, and reset boundaries for Infinity/Quantum flows.

This document focuses on the reset and save-schema contracts relevant to offline-time usage tracking.

## Contract / Behavior Expectations
- Runtime readiness guard:
  - `IsRuntimeStateReady` is true only when Oracle singleton, save settings, and DysonVerse save containers exist.
  - static accessors (`StaticInfinityData`, `StaticPrestigeData`, `StaticSkillTreeData`, `Money`, `Science`, `Bots`) return preload-safe defaults before load completion.
- `SaveDataSettings` now stores per-infinity offline usage counters (seconds):
  - `offlineTimeUsedThisInfinity`
  - `offlineTimeUsedPreviousInfinity`
- Infinity reset boundary behavior:
  - At the start of `DysonInfinity()` and `ManualDysonInfinity()`:
    - `offlineTimeUsedPreviousInfinity = offlineTimeUsedThisInfinity`
    - `offlineTimeUsedThisInfinity = 0`
- Quantum wipe behavior:
  - `PrestigeDoubleWiper()` clears both counters to `0`.
- Artifact skill point reconciliation (`ArtifactSkillPoints()`) is data-driven:
  - iterates reality-layer upgrades from `SimulationUpgradeDefaultsCatalog`
  - counts `AddSkillPoints` effects for owned upgrades via `SimulationUpgradeStateAccessor`
  - preserves legacy `avotation` bonus (+4).
- Migration ensure-step normalizes mega research percent defaults:
  - `matrioshkaUpgradePercent`, `birchUpgradePercent`, `galacticUpgradePercent` are set to `0.03` when loaded as `<= 0`.

## Data Flow
- Counters are incremented by `OfflineTimeManager` when time is consumed.
- `Oracle` does not increment counters during spend; it only performs rollover/reset at reset boundaries.
- `GameManager` reads both counters to render side-panel run-info text.
- `ArtifactSkillPoints()` reads owned-state from existing save fields and upgrades fallback catalog metadata.

## Save / Load Implications
- New counters are additive `double` fields in `SaveDataSettings`.
- Existing saves without these fields deserialize to default `0`, so no migration version bump is required.
- Legacy saves that persisted mega percent values as `0` are normalized to `0.03` during migration ensure-step.
- Export/import and canonical save persistence include these fields as part of the standard save payload.
- Artifact skill point counting uses existing persisted flags; no schema additions required.

## Compatibility Risks
- Moving rollover logic out of `DysonInfinity()`/`ManualDysonInfinity()` will desync "previous infinity" display semantics.
- Clearing only one counter in `PrestigeDoubleWiper()` creates stale values after quantum wipe.
- Removing static accessor null guards can reintroduce pre-load startup crashes in presenters/services that resolve before `Oracle.Start()`.

## Quick Verification Steps
1. Spend offline time in a run and note `offlineTimeUsedThisInfinity`.
2. Trigger Infinity:
   - verify `this` resets to `0`,
   - verify `previous` equals prior run's `this`.
3. Trigger quantum wipe path (`PrestigeDoubleWiper()`):
   - verify both counters reset to `0`.
4. Buy one translation or speed upgrade and verify `ArtifactSkillPoints()` increases by the configured `AddSkillPoints` amount.
5. Load a legacy save with mega research percent at `0` and verify values normalize to `0.03` and mega boost text is non-zero after purchase.
