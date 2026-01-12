# Facility and Skill Refactor Plan

## Continuity Note
- Continue through remaining phases without stopping; update `RefactorProgress.md` after each phase so progress survives context limits.

## Goals
- Move facility production and skill effects to a data-driven system that is easy to extend with new facilities, skills, and upgrades.
- Provide a reliable, complete per-facility breakdown popup that explains every contributing effect in order.
- Preserve current gameplay behavior and save compatibility (with explicit migration).
- Keep production/math order deterministic and avoid hidden side effects.

## Current System Notes (based on code review)
- Core runtime:
  - Production and effects are split across `Assets/Scripts/Systems/ProductionSystem.cs`,
    `Assets/Scripts/Systems/ModifierSystem.cs`, and `Assets/Scripts/Systems/ProductionMath.cs`.
  - `Assets/Scripts/Systems/GameManager.cs` orchestrates update, UI text, and goal/skill point logic.
- Skills:
  - Skill data lives in `Oracle.SkillTree` (dictionary keyed by int) and is applied to
    `DysonVerseSkillTreeData` via `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs`.
  - The skill tree UI uses `SkillTreeManager` nodes keyed by `skillKey` and uses
    `SkillTreeItem` metadata for requirements/exclusivity/refund logic.
  - Skill auto-assignment lists store ints (skill keys) in `DysonVerseSaveData`.
- Facilities:
  - Facilities are represented as `Building` subclasses (Assembly, Managers, Servers, Data Centers, Planets).
  - Production chains and modifiers are computed in `ProductionSystem` + `ModifierSystem`.
  - Facility UI shows Owned/Production text directly from `Building` and `DysonVerseInfinityData`.
- Research:
  - Research upgrades are handled by `Assets/Scripts/Research/*.cs` and use `StaticSkillTreeData`
    for gating and cost changes (e.g., shoulders skills, repeatableResearch).
- Timed effects and special cases:
  - Timers for `androids`, `pocketAndroids`, `superRadiantScattering`.
  - `shoulders*` skills generate research upgrades over time.
  - `secretsOfTheUniverse` modifies upgrade percents and adds multipliers.
  - Manual bot creation has special behavior in `Assets/Scripts/Buildings/ManualBotCreation.cs`.
- Save data:
  - Defaults set in `Oracle.WipeSaveData()`.
  - Migration handled implicitly by `Oracle.Load()` and dictionary save/load.

## Requirements for the New System
- Use ScriptableObjects for facility definitions, skill definitions, and effect definitions.
- Make research upgrades data-driven (definitions, cost curves, effects) and integrate them into the stat pipeline.
- Use stable string IDs for skills/facilities/effects to avoid save breakage.
- Preserve all current skill effects, including:
  - Threshold, log-based, and conditional multipliers.
  - Overrides and caps.
  - Time-based effects and timers.
  - Cross-resource conversions and auto-generated upgrades.
  - Research disabling and cost modifiers.
- Provide a stat breakdown trace with deterministic ordering:
  - Base value -> additive -> multiplicative -> power/override -> clamp.
- Provide per-facility breakdown entries that include source, condition, and value.
- Make the tinker/manual creation system data-driven so future features (auto tinker, secondary bar) are additive.
- Replace per-building subclasses with a single data-driven presenter so new facilities require no new code.

## RefactorProgress Tracking (Agent Continuity)
- Create `RefactorProgress.md` at the project root and update it after each phase or major step.
- Track:
  - Current phase and last completed step.
  - Files touched and any pending TODOs or blockers.
  - Manual Unity editor steps still required.
  - Migration status (saveVersion, SkillIdMap readiness).
  - Validation status (parity checks run, known mismatches).
- If a run is interrupted, the next agent should read `RefactorProgress.md` first and resume from the last step.

## Target Architecture

### Data Assets
- `FacilityDefinition` (ScriptableObject)
  - `id`, `displayName`, `icon`, `description`, `category/tags`
  - `baseStats` (e.g., base production, base cost)
  - `productionFormula` reference (see Formula Effects)
  - `costCurve` / `exponent`
- `SkillDefinition` (ScriptableObject)
  - `id`, `displayName`, `description`, `technicalDescription`
  - prerequisites (ids), exclusives (ids), non-refundable flag
  - skill point cost, fragment flags, line flags (purity/power/etc)
  - `effects[]`
- `ResearchDefinition` (ScriptableObject)
  - `id`, `displayName`, `description`
  - `baseCost`, `exponent`, `maxLevel`, prerequisites (ids)
  - `effects[]`
- `EffectDefinition` (ScriptableObject or serialized struct)
  - `id`, `targetStat`, `operation` (Add, Mult, Power, Override, Clamp)
  - `value`, `perLevel`, `stackOrder`
  - `targetFilter` (facility tags or facility ids)
  - `condition` (optional predicate)
  - `duration/timer` (optional)
- `StatId` (enum or string registry)
  - Facility stats: `Facility.AssemblyLine.Production`, `Facility.AssemblyLine.Cost`, etc.
  - Global stats: `Global.MoneyMulti`, `Global.ScienceMulti`, `Global.PanelLifetime`, etc.
  - Derived stats: `Derived.StarsSurrounded`, `Derived.GalaxiesEngulfed`.
- `FacilityDatabase` / `SkillDatabase` (ScriptableObject)
  - Central lists for lookups and editor tooling.
- `ResearchDatabase` (ScriptableObject)
  - Central list for research definitions.

### Runtime State
- `FacilityState` (runtime)
  - `ownedAuto`, `ownedManual`, `currentLevel`, `effectiveCount`, `productionRate`.
- `SkillState` (runtime)
  - `owned`, `level` (if applicable), `timers`.
- `ResearchState` (runtime)
  - `level`, `unlocked`, `autoBuyEnabled`.
- `GameStateSnapshot`
  - A read-only view of save data needed for calculations.

### Stat Calculation + Breakdown
- `StatCalculator`
  - Inputs: base value, effect list, context.
  - Output: `StatValue` + `List<Contribution>` for breakdown UI.
  - Order: base -> additive -> multiplicative -> power/override -> clamp.
- `Contribution`
  - `sourceId`, `sourceName`, `operation`, `value`, `resultDelta`, `conditionText`, `order`.
- `FacilityBreakdown`
  - Collects all contributions affecting a facility's key stats.

### Effects That Require Code-Backed Formulas
Keep these as code-backed effects but still return breakdown entries:
- Log/threshold scaling (e.g., `planetAssembly`, `stellarSacrifices`, `rule34`).
- Cross-resource conversions (`shoulders*` upgrades adding to upgrade counts).
- Timed multipliers (`androids`, `pocketAndroids`, `superRadiantScattering`).
- Power/overwhelming formula overrides for money/science.
- Secrets of the universe (tier-based modifications).

## Implementation Plan (Single Pass, Phased)

### Phase 1: Foundations (Data + Stat Pipeline)
- Create ScriptableObjects:
  - `FacilityDefinition`, `SkillDefinition`, `EffectDefinition`, `FacilityDatabase`, `SkillDatabase`.
- Build `StatId` registry and `StatCalculator` with breakdown output.
- Add `FacilityRuntime` system:
  - Converts save data into `FacilityState` (owned, effective counts).
  - Applies stat calculator and produces `FacilityBreakdown`.
- Add `EffectProviders`:
  - Skill provider (from skill definitions + owned states).
  - Secret provider (from `dvpd.secretsOfTheUniverse`).
  - Prestige provider (from `PrestigePlus`).
  - Research provider (from research levels, implemented during Phase 4).

### Phase 2: Facility Production Migration
- Replace `ProductionSystem` computations with data-driven formulas:
  - Start with Assembly Lines -> Managers -> Servers -> Data Centers -> Planets.
  - Implement each formula in `ProductionFormula` classes (code-backed ScriptableObjects).
- Replace `ModifierSystem` with effects:
  - Move each skill and secret into `EffectDefinition` or formula-backed effects.
  - Preserve order, thresholds, and log scaling in formula nodes.
- Add `FacilityBreakdown` output for each facility:
  - Store results for UI popups.

### Phase 3: Skill Tree Migration
- Replace `SkillTreeItem` + `SetSkillsOnOracle` usage with `SkillDefinition` assets.
- `SkillTreeManager` should reference `SkillDefinition` instead of `skillKey`.
- Replace skill state storage:
  - Save `owned` states by `skillId` instead of int keys.
  - Migrate auto-assignment lists to `skillId` string list.
- Update prerequisites/exclusive/line logic to use IDs.

### Phase 4: Research Data Migration
- Create `ResearchDefinition` assets for existing research upgrades (science, money, assembly, AI, servers, data centers, planets).
- Add `ResearchDatabase` and a `ResearchEffectProvider` that feeds the stat pipeline based on research levels.
- Move research UI to reference `ResearchDefinition` instead of hard-coded subclasses where feasible.
- Preserve special research logic (`repeatableResearch`, auto-buy toggles, disabling science boost when shoulders-of-giants).
- Add parity checks for research cost/level math and output effects.

### Phase 5: Save Data + Migration
- Add new fields to `SaveDataSettings`:
  - `Dictionary<string, bool> skillOwnedById`
  - `Dictionary<string, int> upgradeLevelsById`
  - `Dictionary<string, double> timersById`
- In `Oracle.WipeSaveData()`:
  - Initialize new dictionaries and default values.
- In `Oracle.Load()`:
  - Migrate old `SkillTreeSaveData` and `skillAutoAssignmentList` to new IDs.
  - Preserve existing progress if new data is missing.
- Keep legacy fields until parity is confirmed.

## Save Migration Strategy (No Save Breakage)
- Add `saveVersion` to `SaveDataSettings` and bump it only after each migration completes.
- Create a `MigrationRegistry` with ordered steps (e.g., v0 -> v1, v1 -> v2).
- Keep legacy data fields until at least one stable release post-migration.
- Use a `SkillIdMap` (ScriptableObject or static map) that maps old int keys to new string IDs.
- Migration flow:
  - Load save (ES3 or Odin), then run `ApplyMigrations()` before any gameplay calculations.
  - Populate new dictionaries if missing, never overwrite newer data.
  - Keep old fields intact for rollback and parity validation.
- Add a migration flag or backup:
  - `lastMigratedFromVersion` and optional copy of pre-migration data for debugging.
- Update `Oracle.WipeSaveData()` to set `saveVersion` and initialize new dicts.
- Add sanity validation on load:
  - Count owned skills vs. pre-migration owned count.
  - Log warnings if mismatches and skip destructive cleanup.

## Save Safety Guardrails (Avoid Wiping on Early Quit)
- Gate all saves behind a load-complete flag (e.g., `isSaveReady`), set only after load + migrations succeed.
- In `Oracle.Save()` and `OnApplicationQuit()`/`OnApplicationFocus()`, return early if not ready.
- Avoid auto-saves during load by pausing `InvokeRepeating(nameof(Save), ...)` until load completes.
- Record a `lastSuccessfulLoadUtc` to help diagnose any unexpected save timing.

### Phase 6: UI Breakdown Popups
- Add a `FacilityBreakdownPopup` UI prefab.
- Add a `FacilityPresenter` on each facility card:
  - Clicking opens popup, pulls breakdown data.
  - Show: base, additive, multipliers, conditionals, final.
- Keep existing card UI and wire new breakdown button/tooltip.

### Phase 6.5: Tinker System Data-Driven (Manual Bot Creation)
- Add tinker stats to the global stat pipeline:
  - `Tinker.BotYield`, `Tinker.AssemblyYield`, `Tinker.CooldownSeconds`.
  - Provide breakdown contributions for manual labour and future auto/secondary effects.
- Convert `manualLabour` and `versatileProductionTactics` to tinker-targeted effects.
- Update `ManualBotCreation` to read pipeline values and log/emit breakdowns (UI later).
- Keep `manualCreationTime` in save data; treat it as the base cooldown state.
- Leave room for future: `AutoTinkerRate`, `SecondaryTinkerRate` as additional stats.

### Phase 7: Remove Legacy Paths
- Remove old `SetSkillsOnOracle` and `DysonVerseSkillTreeData` bool usage from runtime.
- Replace `ModifierSystem`/`ProductionSystem` calls with new pipeline.
- Remove `SkillTreeItem` dependencies if fully migrated.

### Phase 8: Generic Building Presenter
- Replace `AssemblyLineManager`, `ManagerManager`, etc. with a single `FacilityBuildingPresenter` (name TBD).
- Presenter reads `FacilityDefinition` + `FacilityRuntime` for cost, owned, and production text.
- `BuildingReferences` stays as the UI wiring surface to avoid prefab churn.
- Add a small data-driven format map for per-facility labels/phrasing (optional per-facility overrides).
- Once validated, delete the old subclasses and update prefabs to use the new presenter.

## Manual Unity Editor Setup (Required)
- Create ScriptableObjects:
  - `Assets/Data/Facilities/*.asset` for each facility.
  - `Assets/Data/Skills/*.asset` for each skill.
  - `Assets/Data/Effects/*.asset` for shared effects.
  - `Assets/Data/Research/*.asset` for each research item.
  - `Assets/Data/Databases/FacilityDatabase.asset` and `SkillDatabase.asset`.
  - `Assets/Data/Databases/ResearchDatabase.asset`.
- Update scene references:
  - Replace or extend facility UI components to reference `FacilityDefinition`.
  - Add `FacilityPresenter` to each facility card prefab/GO:
    - Set `facilityId` (`assembly_lines`, `ai_managers`, `servers`, `data_centers`, `planets`).
    - Wire the card's breakdown/details button to `breakdownButton`.
    - Assign the scene `FacilityBreakdownPopup` or leave null to auto-find.
  - Add `FacilityBreakdownPopup` to the UI canvas and assign:
    - `root`, `titleText`, `valueText`, `breakdownText`.
  - Update `SkillTreeManager` nodes to reference `SkillDefinition` assets.
- Assign database references:
  - Add database references to `Oracle` or a new `GameDataRegistry` component.
  - Ensure `ResearchDatabase` is assigned alongside facility/skill/effect databases.
- Verify prefab variants for facility cards after adding new fields.

## Skill Coverage Checklist (Must Map to Effects or Formulas)
- Facility multipliers/scaling: `assemblyLineTree`, `aiManagerTree`, `serverTree`, `dataCenterTree`, `planetsTree`,
  `productionScaling`, `superSwarm`, `megaSwarm`, `ultimateSwarm`, `fragmentAssembly`, `progressiveAssembly`,
  `oneMinutePlan`, `versatileProductionTactics`, `whatWillComeToPass`, `hypercubeNetworks`,
  `clusterNetworking`, `parallelProcessing`, `terra*`, `stellar*`, `dysonSubsidies`, `agressiveAlgorithms`,
  `endOfTheLine`, `worthySacrifice`, `superchargedPower`.
- Production sources/unlocks: `scientificPlanets`, `hubbleTelescope`, `jamesWebbTelescope`,
  `terraformingProtocols`, `planetAssembly`, `shellWorlds`, `stellarSacrifices`,
  `pocketDimensions`, `pocketProtectors`, `pocketMultiverse`, `dimensionalCatCables`,
  `solarBubbles`, `pocketAndroids`, `quantumComputing`, `rudimentarySingularity`,
  `unsuspiciousAlgorithms`, `parallelComputation`, `whatCouldHaveBeen`,
  `shouldersOfTheFallen`, `shoulderSurgery`, `stayingPower`, `rule34`.
- Economy multipliers/tradeoffs: `startHereTree`, `doubleScienceTree`, `producedAsScienceTree`,
  `regulatedAcademia`, `economicRevolution`, `scientificRevolution`, `workerBoost`,
  `purityOfMind`, `purityOfSEssence`, `higgsBoson`, `idleSpaceFlight`,
  `shouldersOfTheRevolution`, `monetaryPolicy`, `paragon`, `renegade`,
  `scientificDominance`, `economicDominance`, `fusionReactors`, `coldFusion`,
  `tasteOfPower`, `indulgingInPower`, `addictionToPower`, `dysonSubsidies`, `stellarDominance`.
- Formula overrides: `powerUnderwhelming`, `powerOverwhelming`, `shouldersOfPrecursors`.
- Panels per sec/lifetime: `workerEfficiencyTree`, `burnOut`, `reapers`, `rocketMania`, `saren`,
  `panelLifetime20Tree`, `panelMaintenance`, `panelWarranty`, `artificiallyEnhancedPanels`,
  `renewableEnergy`, `androids`, `shepherd`, `citadelCouncil`, `worthySacrifice`.
- Timers/offline/manual actions: `androids`, `pocketAndroids`, `superRadiantScattering`, `idleElectricSheep`,
  `manualLabour`, `versatileProductionTactics`.
- Research gating/costs: `repeatableResearch`, `assemblyMegaLines`, `shouldersOfGiants`,
  `shouldersOfTheEnlightened`, `shouldersOfPrecursors`.
- Research upgrades: science boost, money multi, assembly line, AI manager, server, data center, planet,
  panel lifetime tiers, auto-buy toggles.
- Currently unused in runtime: `banking`, `investmentPortfolio`, `terraNova`, `terraGloriae`.
  - Decide if these are intended or dead; keep in data for now.

## Watchouts / Risks
- Call order dependencies: `ModifierSystem` and `ProductionSystem` assume a specific order.
- Offline simulation uses iterative per-minute updates; new pipeline must be deterministic.
- Multiple timers (androids, pocket androids, superRadiantScattering) must persist in save data.
- Secrets of the universe modify upgrade percents and should be represented as effects.
- Auto-buy and research gating uses skill flags; must be preserved.
- Research auto-buy toggles and repeatable research cost formulas must remain compatible with current UI/flow.
- `skillAutoAssignmentList` and preset lists use int keys; requires migration to string IDs.
- `Oracle.WipeSaveData()` must set defaults for new dictionaries and timers.
- `ResearchManager` and Dream1 systems are separate; do not break while refactoring core facilities.

## Validation Plan
- Add a debug toggle to compare old vs new outputs for:
  - Money/sec, Science/sec, Production chain outputs.
  - Facility modifiers for each facility type.
  - Panel lifetime and panel per sec.
- Validate parity for a save with a broad skill set.
- Validate offline progress accumulation matches existing behavior.
- Validate research costs/levels and auto-buy toggles match existing behavior.
- Validate UI breakdown entries line up with totals.

## Suggested File/Folder Layout
- `Assets/Scripts/Systems/Stats/`
  - `StatId.cs`, `StatCalculator.cs`, `Contribution.cs`
  - `ResearchEffectProvider.cs`
- `Assets/Scripts/Data/`
  - `FacilityDefinition.cs`, `SkillDefinition.cs`, `EffectDefinition.cs`
  - `ResearchDefinition.cs`
  - `FacilityDatabase.cs`, `SkillDatabase.cs`, `ResearchDatabase.cs`
- `Assets/Scripts/Systems/Facilities/`
  - `FacilityRuntime.cs`, `FacilityPresenter.cs`, `FacilityBreakdownPopup.cs`
- `Assets/Data/Facilities/`, `Assets/Data/Skills/`, `Assets/Data/Effects/`, `Assets/Data/Research/`,
  `Assets/Data/Databases/`

