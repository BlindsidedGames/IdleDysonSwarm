# OfflineProgressSystem

## Purpose
`OfflineProgressSystem` is the runtime simulation path for "away time" in DysonVerse.

It is used in two flows:
- "Welcome Back" return flow when the app resumes after being closed/idle (adds to `SaveDataSettings.offlineTime`).
- Consuming stored offline time via the Offline Time UI (`OfflineTimeManager`), which calls `GameManager.RunAwayTime(...)` to advance production/resources.

## Entry Points
- `Systems.OfflineProgressSystem.ApplyReturnValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)`
  - Updates `SaveDataSettings.offlineTime` (capped by `maxOfflineTime`), and updates return-screen UI if present.
- `Systems.OfflineProgressSystem.CalculateAwayValues(double awayTime, OfflineProgressContext context, OfflineProgressUI ui)`
  - Coroutine that advances production and resource totals in minute-sized steps plus a remainder.

## Data Flow
- Caller constructs:
  - `OfflineProgressContext` from `GameManager`:
    - `infinityData`, `prestigeData`, `skillTreeData`, `saveSettings`
    - delegates: `CalculateProduction`, `CalculateShouldersSkills`, `MoneyToAdd`, `ScienceToAdd`, `SetBotDistribution`
  - `OfflineProgressUI` from `GameManager` return-screen references (all optional for simulation correctness).
- Simulation:
  - Iterates `minutes = floor(awayTime / 60)` (with a `remainder` seconds step after the loop).
  - Updates skill timers (androids, pocket androids) and producer resources (planets → data centers → servers → managers → assembly lines → bots).
  - Calls production recalculation delegates between resource updates to keep derived rates consistent.

## UI Contract (Important)
UI references (`OfflineProgressUI`) are optional.

The simulation must not throw if:
- a return-screen UI object/text is missing in a scene or prefab variant, or
- a button invokes `RunAwayTime` while those UI references are unassigned.

The system should still advance save data even without UI.

## Save / Load Implications
- `SaveDataSettings.offlineTime` is increased in `ApplyReturnValues` and decreased elsewhere when spent.
- `CalculateAwayValues` mutates `DysonVerseInfinityData` and `DysonVersePrestigeData` in-place.
- Some `DysonVerseInfinityData` arrays are expected to be length 2. Older saves/migrations can leave new arrays null; the system now sanitizes these arrays before simulation.

## Performance Notes
- The coroutine steps once per simulated minute and yields each iteration; large `awayTime` values can take noticeable real time to simulate.
- UI slider updates happen once per minute (if slider references exist).

## Quick Verification Steps
1. In the `Game` scene, accrue some `offlineTime` and open the Offline Time UI.
2. Press the spend/confirm button. Expect:
   - no `NullReferenceException` in `OfflineProgressSystem.CalculateAwayValues`
   - production/resources advance by the selected amount
3. Temporarily unassign one or more return-screen UI references on `GameManager` (e.g., `awayForHeader`) and repeat step 2.
   - Expect: simulation still runs; UI updates are skipped where references are missing.

