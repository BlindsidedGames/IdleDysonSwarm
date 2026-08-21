# OfflineTimeManager

## Purpose
`OfflineTimeManager` owns the runtime UI flow for spending stored offline time from both:
- the offline-time modal (`SpendTime`, `SpendAgain`), and
- side-panel quick-spend buttons (2m/10m/1h).

It is also the single accounting path for per-infinity offline usage tracking.

## Contract / Behavior Expectations
- All spend paths must route through `TrySpendOfflineTime(double requestedSeconds, out double spentSeconds)`.
- Spend behavior is clamp-based:
  - spends `min(requestedSeconds, saveSettings.offlineTime)`.
- A successful spend must:
  - call `GameManager.RunAwayTime(spentSeconds)`,
  - decrement `saveSettings.offlineTime` by `spentSeconds`,
  - increment `saveSettings.offlineTimeUsedThisInfinity` by `spentSeconds`.
- Quick button interactability must reflect current available `offlineTime`.
- Modal double-tap confirmation behavior remains unchanged.

## Data Flow
- Inputs:
  - `Oracle.saveSettings.offlineTime`, `maxOfflineTime`
  - slider/button UI events
- Outputs:
  - spend side effects on save data
  - run-away simulation via `GameManager`
  - updated UI state (buttons, slider, displayed amounts)

## Save / Load Implications
- Writes directly to save-backed `SaveDataSettings` fields:
  - `offlineTime`
  - `offlineTimeUsedThisInfinity`
- Counter rollover (`this` -> `previous`) is not owned here; it is owned by Infinity reset paths in `Oracle`.

## Performance Notes
- Spend logic is event-driven, not per-frame heavy.
- `Update()` only reacts when offline time changes or modal open state transitions.

## Quick Verification Steps
1. Open the offline modal with sufficient stored time.
2. Spend via slider confirm, then `Spend Again`, then side-panel quick buttons.
3. Confirm each spend:
   - reduces `offlineTime`,
   - advances away-time simulation,
   - increases `offlineTimeUsedThisInfinity`.
4. Confirm quick button interactability updates as remaining offline time drops below thresholds.
