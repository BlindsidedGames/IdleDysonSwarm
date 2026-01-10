# Facility and Skill Refactor Plan

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

### Runtime State
- `FacilityState` (runtime)
  - `ownedAuto`, `ownedManual`, `currentLevel`, `effectiveCount`, `productionRate`.
- `SkillState` (runtime)
  - `owned`, `level` (if applicable), `timers`.
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
  - Research provider (from research levels).

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

### Phase 4: Save Data + Migration
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

### Phase 5: UI Breakdown Popups
- Add a `FacilityBreakdownPopup` UI prefab.
- Add a `FacilityPresenter` on each facility card:
  - Clicking opens popup, pulls breakdown data.
  - Show: base, additive, multipliers, conditionals, final.
- Keep existing card UI and wire new breakdown button/tooltip.

### Phase 6: Remove Legacy Paths
- Remove old `SetSkillsOnOracle` and `DysonVerseSkillTreeData` bool usage from runtime.
- Replace `ModifierSystem`/`ProductionSystem` calls with new pipeline.
- Remove `SkillTreeItem` dependencies if fully migrated.

## Manual Unity Editor Setup (Required)
- Create ScriptableObjects:
  - `Assets/Data/Facilities/*.asset` for each facility.
  - `Assets/Data/Skills/*.asset` for each skill.
  - `Assets/Data/Effects/*.asset` for shared effects.
  - `Assets/Data/Databases/FacilityDatabase.asset` and `SkillDatabase.asset`.
- Update scene references:
  - Replace or extend facility UI components to reference `FacilityDefinition`.
  - Add `FacilityPresenter` to each facility card prefab/GO.
  - Assign `FacilityBreakdownPopup` prefab reference in the UI manager.
  - Update `SkillTreeManager` nodes to reference `SkillDefinition` assets.
- Assign database references:
  - Add database references to `Oracle` or a new `GameDataRegistry` component.
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
- Currently unused in runtime: `banking`, `investmentPortfolio`, `terraNova`, `terraGloriae`.
  - Decide if these are intended or dead; keep in data for now.

## Watchouts / Risks
- Call order dependencies: `ModifierSystem` and `ProductionSystem` assume a specific order.
- Offline simulation uses iterative per-minute updates; new pipeline must be deterministic.
- Multiple timers (androids, pocket androids, superRadiantScattering) must persist in save data.
- Secrets of the universe modify upgrade percents and should be represented as effects.
- Auto-buy and research gating uses skill flags; must be preserved.
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
- Validate UI breakdown entries line up with totals.

## Suggested File/Folder Layout
- `Assets/Scripts/Systems/Stats/`
  - `StatId.cs`, `StatCalculator.cs`, `Contribution.cs`
- `Assets/Scripts/Data/`
  - `FacilityDefinition.cs`, `SkillDefinition.cs`, `EffectDefinition.cs`
  - `FacilityDatabase.cs`, `SkillDatabase.cs`
- `Assets/Scripts/Systems/Facilities/`
  - `FacilityRuntime.cs`, `FacilityPresenter.cs`, `FacilityBreakdownPopup.cs`
- `Assets/Data/Facilities/`, `Assets/Data/Skills/`, `Assets/Data/Effects/`, `Assets/Data/Databases/`

