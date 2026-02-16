# GameManager

## Purpose
`GameManager` is the runtime orchestrator for DysonVerse scene behavior. It sequences production/stat updates, refreshes core HUD values, and coordinates return/offline UI flows using live save data from `Oracle`.

## Entry Points
- `Start()`
  - Initializes runtime state and key UI defaults.
- `Update()`
  - Runs per-frame simulation orchestration and text refreshes.
- `OnEnable()` / `OnDisable()`
  - Subscribes/unsubscribes event hooks used by skill/UI refresh paths.
- `SetSkillsReferences(SidePanelReferences refs)`
  - Rebinds Skills UI references when side panel variants are swapped.
- `UpdateSkillsInvoke()`
  - Raises the static skill refresh event for subscribers.

## Data Flow
- Source of truth:
  - `oracle.saveSettings.dysonVerseSaveData` and nested `infinityData`, `prestigeData`, `skillTreeData`, `prestigePlus`.
- Per-frame:
  - Calls system helpers (`ProductionSystem`, `ModifierSystem`) to recalculate production and multipliers.
  - Writes computed values into scene TMP labels (cash/science, per-second rates, bot/panel stats, timers).
- Side panel swapping:
  - `SidePanelController` passes `SidePanelReferences` into `SetSkillsReferences` so skill UI links remain valid.
- Side-panel run info:
  - `UpdateTextFields()` assembles `skillTimersDisplayText` for the blue bottom stats block.
  - Includes current/last infinity timing, IP rate, offline-spend counters, panel/stellar progression, and skill timers.
  - Section order:
    - Bold `General` section (`Cash Multiplier`, `Research Multiplier`, `Panel Lifetime`, then `Active Panels`, `Stars Surrounded`, `Galaxies Engulfed`)
    - Bold `Infinity` section with `s/IP`, `Run Time` (`Current`/`Previous`), and `Offline Time Used` (`Current`/`Previous`)
    - Bold `Skills` section for skill timers/effects
  - Uses a half-height spacer (`<br><size=50%> </size><br>`) between selected subsection transitions
    (for example `Panel Lifetime -> Active Panels`, `s/IP -> Run Time`, `Run Time -> Offline Time Used`).
  - Infinity/offline source fields:
    - `oracle.saveSettings.offlineTimeUsedThisInfinity`
    - `oracle.saveSettings.offlineTimeUsedPreviousInfinity`
  - Timer labels (panel lifetime, current/last infinity, offline usage, skill timers) render with `CalcUtils.FormatTime(...)`
    and pass `colourOverride` into the method so numeric values are colored but unit suffixes (`d/h/m/s`) are not.
  - General metrics, `s/IP`, and `Current`/`Previous` rows under `Run Time` and `Offline Time Used`
    are rendered at small text size (`<size=80%>`).
  - Skill rows are rendered at small text size with bold skill names.
  - `s/IP` is rendered with `showDecimal: true` to preserve sub-second precision.
  - `Run Time` (`Current`/`Previous`) rows are also rendered with `showDecimal: true` for sub-second precision.

## Save / Load Implications
- Mutates values in save-backed structures through `Oracle` references, so runtime changes persist into future saves.
- Any field/path changes under `DysonVerseSaveData` consumed here must be coordinated with migration logic in `Oracle.Migrations`.
- UI formatting changes in this class alter player-facing numeric rendering but not persisted numeric values.

## Performance Pitfalls
- `Update()` drives many text and stat updates; avoid adding unnecessary allocations or repeated expensive calculations.
- Repeated formatted-string construction can impact frame time on lower-end devices if expanded further.

## Quick Verification Steps
1. Open the `Game` scene and enter play mode.
2. Confirm these labels render with m-space digit spacing:
   - cash
   - cash per second
   - science
   - science per second
   - total bots
3. Verify values still increment correctly over time and no TMP rich-text warnings/errors appear in console.
4. Spend offline time and confirm the blue side-panel run-info block updates:
   - `Run Time` `Current`/`Previous` values show decimal seconds when sub-second precision exists.
   - `Offline Time Used (This Infinity)` increases by spent seconds.
   - `Offline Time Used (Previous Infinity)` remains unchanged until the next Infinity reset.
