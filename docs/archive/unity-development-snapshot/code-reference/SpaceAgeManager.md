# SpaceAgeManager

## Purpose
Runtime Simulation Space Age controller. It applies energy production, manages railgun/swarm loops, handles black-hole prestige flow, and updates Space Age info UI.

## Contract And Behavior
- Solar info description must derive output from live values:
  - `sdSimulation.solarPanelGeneration`
  - mathematics runtime bonus (`mathematicsComplete ? x2 : x1`)
  - Double Time multiplier
- Solar text must not use a hardcoded `100W/panel` base.
- Total generation shown in UI should match the same effective values used in production display paths.

## Data Flow
- Input: per-frame `Update`, owned boosts from `SaveDataPrestige`, and panel interactions.
- Writes: `SaveDataDream1.energy`, timers, swarm/railgun counters, and prestige progression.
- Coordinates with `SimulationPrestigeManager.InvokeApplyResearch()` after simulation wipe.

## Save/Load Implications
- No save schema changes.
- Display now reflects corrected parity state where mathematics-owned saves can have `solarPanelGeneration >= 200`.
- If mathematics parity rules change, update this panel breakdown text to keep UI and simulation state coherent.

## Performance Notes
- Runs each frame; avoid expensive string/format changes outside debounced info-description updates.
- Keep production loops deterministic and allocation-light.

## Quick Verification
1. Set `solarPanels=100`, `solarPanelGeneration=100`, no Double Time, mathematics incomplete.
2. Confirm solar panel info shows base/effective output consistent with 100W per panel baseline.
3. Complete mathematics (or own Mathematics III) so parity sets generation to at least 200 and runtime math bonus applies.
4. Confirm solar panel info now reports effective 400W/panel equivalent and `40.0 KW` total for 100 panels.
5. Toggle Double Time and verify multiplier text/output updates consistently.
