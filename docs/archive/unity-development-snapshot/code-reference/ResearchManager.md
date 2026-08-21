# ResearchManager

## Purpose
Runtime manager for the Simulation/Reality upgrade shop UI. It controls panel visibility, purchase actions, and simulation-prestige reapplication of permanent simulation effects.

## Contract And Behavior
- Upgrade costs are read via `BalanceRuntime.GetUpgradeCost(...)` with fallback from `SimulationUpgradeDefaultsCatalog`.
- Purchase effects are applied via `SimulationUpgradeEffectApplier`:
  - database definition effects first (`SimulationUpgradeDatabase`)
  - fallback catalog effects second (`SimulationUpgradeDefaultsCatalog`) when definitions are missing/incomplete.
- Prerequisite gating is resolved through data (`SimulationUpgradePrerequisite`) instead of hardcoded switch logic.
- `mathematics3` must still enforce idempotent parity:
  - `sdSimulation.mathematicsComplete = true`
  - `sdSimulation.solarPanelGeneration >= 200`
- `ApplyResearch()` reapplies owned **simulation-layer** upgrades only (reality upgrade side effects are not replayed here).

## Data Flow
- Input:
  - UI button presses
  - owned-state flags from existing save fields (`SaveDataPrestige` / `SaveData`)
  - upgrade definitions from ScriptableObject database or fallback catalog.
- Writes:
  - existing save containers (`SaveDataPrestige`, `SaveDataDream1`, `SaveData`)
  - skill points for translation/speed upgrades via effect payloads.
- Triggered by:
  - panel button listeners in `Start()`
  - `SimulationPrestigeManager.ApplyResearch` after simulation wipe.

## Save/Load Implications
- No schema changes.
- Upgrade keys must keep mapping to existing save fields (or accessor adapters) to maintain compatibility.
- Owning `mathematics3` guarantees a minimum solar generation baseline of `200` in simulation save state.
- Any parity changes must stay aligned with:
  - `Assets/Scripts/Expansion/Dream1/InformationEraManager.cs`
  - `Assets/Scripts/Expansion/Oracle.Migrations.cs`
  - `Assets/Scripts/Systems/Balance/SimulationUpgradeDefaultsCatalog.cs`

## Performance Notes
- `UpdateAndEnableResearches()` is invoked repeatedly; panel checks use lightweight ownership/prerequisite lookups.
- Keep effect reapply and parity paths allocation-light, especially during prestige/reload paths.

## Quick Verification
1. Run `Tools/Idle Dyson/Data/Create/Balance Tool Assets` to seed upgrade assets.
2. In editor play mode, buy a simulation upgrade and confirm:
  - ownership flag is written to existing save fields,
  - effect targets are updated as configured.
3. Buy `Mathematics III`; verify:
  - `sdPrestige.mathematics3 == true`
  - `sdSimulation.mathematicsComplete == true`
  - `sdSimulation.solarPanelGeneration >= 200`.
4. Trigger simulation prestige wipe and verify `ApplyResearch()` replays simulation upgrades and parity remains stable.
5. Change one upgrade cost in `SimulationUpgradeDatabase` and confirm UI affordability updates without code changes.
