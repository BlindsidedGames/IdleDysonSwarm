# ResearchManager

## Purpose
Runtime manager for the Simulation/Reality research shop UI. It controls panel visibility, purchase actions, and prestige-time reapplication of permanent research effects.

## Contract And Behavior
- `PurchaseEducation(15)` (Mathematics III) must call idempotent parity logic:
  - `sdSimulation.mathematicsComplete = true`
  - `sdSimulation.solarPanelGeneration >= 200`
- `ApplyResearch()` must enforce the same parity rule when `sdPrestige.mathematics3` is owned.
- The parity rule must be idempotent so repeated prestige applies do not keep multiplying generation.

## Data Flow
- Input: UI button presses and owned unlock booleans in `SaveDataPrestige`.
- Writes: `SaveDataDream1` research completion/timers and simulation progression state.
- Triggered by: `SimulationPrestigeManager.ApplyResearch` event after simulation wipe.

## Save/Load Implications
- No schema changes.
- Owning `mathematics3` now guarantees a minimum solar generation baseline of `200` in simulation save state.
- Any future change to this behavior must also update:
  - `Assets/Scripts/Expansion/Dream1/InformationEraManager.cs`
  - `Assets/Scripts/Expansion/Oracle.Migrations.cs`

## Performance Notes
- `UpdateAndEnableResearches` is invoked repeatedly; avoid expensive allocations/queries in panel update paths.
- Keep parity helper O(1) and allocation-free.

## Quick Verification
1. In a save with enough Strange Matter, buy Mathematics III from research.
2. Confirm `sdPrestige.mathematics3 == true`, `sdSimulation.mathematicsComplete == true`, and `sdSimulation.solarPanelGeneration >= 200`.
3. Trigger a simulation prestige wipe and verify parity is still applied immediately after `ApplyResearch`.
4. Repeat apply path multiple times and verify solar generation does not exceed intended value due to repeated applies.
