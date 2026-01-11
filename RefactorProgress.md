# Refactor Progress Tracker

## How to Use
- Update this file after each completed step or phase.
- If interrupted, the next agent should read this file first and resume from the last entry.

## Current Phase
- Phase: Phase 4 (research data migration)
- Owner: Codex
- Date: 2026-01-10

## Last Completed
- Added save gating and autosave scheduling guardrails in `Assets/Scripts/Expansion/Oracle.cs`.
- Added saveVersion + migration scaffolding fields and hooks.
- Added RefactorProgress tracking instructions in `FacilityAndSkillRefactor.md`.
- Added initial data assets and stat pipeline scaffolding (definitions, databases, stat calculator).
- Added facility runtime scaffolding (state, breakdown, runtime).
- Added legacy bridge to compute Assembly Line production via new stat pipeline.
- Added debug context menu to compare Assembly Line production (legacy vs pipeline).
- Updated debug comparison to use inline legacy formula and report inputs.
- Adjusted legacy bridge to use float-precision base production for parity.
- Added AI Manager legacy bridge and debug comparison hook.
- Added Server legacy bridge and debug comparison hook.
- Added Data Center and Planet legacy bridges and debug comparison hooks.
- Added Data Center extras (rudimentary singularity + parallel computation) to legacy bridge.
- Added Planet pocket dimensions chain to legacy bridge and aligned pocket protectors gating.
- Updated planet runtime and debug comparisons to include prestige data and extra modifiers.
- Added a debug context menu to run parity checks with temporary test values (Data Centers + Planets).
- Updated stat calculator to apply effects strictly by order so additive effects can be applied after multipliers.
- Added rudimentary singularity parity check and expanded the temporary parity runner to cover it.
- Verified rudimentary singularity parity via temporary test run (delta 0).
- Added planet generation pipeline (scientific planets, planet assembly, shell worlds, stellar sacrifices) with parity debug.
- Expanded the temporary parity runner to cover assembly lines, AI managers, and servers in sequence.
- Consolidated parity menu entries into a single suite and added tests for stellar sacrifice bot drain + shoulders-of-the-fallen bonuses.
- Added shoulders-of-giants/what-could-have-been accrual parity tests and added stellar sacrifice variant scenarios.
- Verified parity suite run: all deltas zero (facility chain + planet generation + stellar sacrifice + shoulders accruals).
- Added ScriptableObject-driven effect pipeline scaffolding (effect context, condition evaluator, skill effect provider, facility effect pipeline).
- Added editor tool to generate core facility skill/effect assets (rule34, stayingPower, superchargedPower, rudimentarySingularity, parallelComputation, pocketDimensions).
- Added dynamic value resolution for core facility effects in SkillEffectProvider.
- Added data-driven parity output in facility comparisons when skill/effect assets are present.
- Added parity suite summary log that reports any nonzero deltas.
- Aligned data-driven base production with legacy float precision and set rudimentary singularity flag in parity suite.
- Verified parity suite with data-driven effects: all deltas within epsilon.
- Added full skill effect catalog pass (core production + modifiers + global multipliers + shoulders accruals).
- Added shoulder surgery bonus to pocket dimensions data-driven effect.
- Added shoulders-of-precursors money override and fixed skill id extraction for dynamic effects.
- Matched legacy float constants for staying power and parallel computation to remove tiny parity drift.
- Swapped facility production in `ProductionSystem` to prefer data-driven runtimes with legacy fallbacks.
- Preserved parallel computation server increment behavior while using data-driven production rates.
- Restored pocket dimensions production to legacy (shoulder surgery bonus no longer affects facility output).
- Ran parity suite after facility swap: all deltas within epsilon.
- Short play session with `GameDataRegistry` in scene: no visible issues.
- Moved planet generation + shoulders accrual calculations to data-driven pipeline with legacy fallback.
- Moved money/science multipliers and panels-per-second to data-driven pipeline with legacy fallback.
- Added a debug context menu to log data-driven breakdowns for facilities + global stats.
- Added a facility modifier pipeline (terra thresholds + infinity buffs + secrets + Avocato) with legacy fallback.
- Updated modifier calculations to prefer data-driven results and extracted legacy modifier helpers.
- Added facility modifier parity checks to the parity suite.
- Adjusted server modifier effect ordering (cluster networking/parallel processing) to align with legacy order.
- Matched float constants for server modifier log multipliers to remove tiny parity drift.
- Added research data scaffolding (definitions/database) and registry + asset creator wiring.
- Expanded `FacilityAndSkillRefactor.md` with a research migration phase and updated setup/validation notes.
- Integrated modifier breakdown contributions into facility production effects.
- Added a secrets-only helper for modifier breakdowns to avoid mutating upgrade percents.
- Updated data-driven parity comparisons to use modifier pipeline expected values.
- Added `SkillIdMap` for legacy key to id mapping and wired it into the asset creator.
- Added skill ownership + auto-assign id lists to save data with migration hooks (saveVersion 2).
- Added `SkillFlagAccessor` and updated `SkillEffectProvider` to prefer id ownership with dvst fallback.
- Updated skill tree UI and auto-assignment scripts to use `SkillDefinition`/skill ids with legacy fallbacks.
- Added Oracle helpers for skill ownership, auto-assignment id conversion, and skill reset.
- Play-mode sanity check: skill tree interactions functioning as normal (user report).
- Synced skill id ownership from dvst during parity suite to avoid stale id-based effects in debug runs.
- Added research id map + research level save migration (saveVersion 3) with `researchLevelsById`.
- Added research effect provider and wired research effects into global multipliers + facility modifiers.
- Updated shoulders accruals + research upgrade components to use id-based research levels.
- Added panel lifetime stat pipeline with legacy fallback + parity suite check hook.
- Added editor tool to create core research definitions/effects using current scene costs.
- Logged panel lifetime breakdowns in the data-driven debug output.
- Research UI now pulls cost/name from `ResearchDefinition` assets when available.
- Facility modifier breakdown now folds additive upgrade contributions into the base multiplier (avoids fallback).
- Added parity checks for money/science multipliers.
- Ran facility parity suite after research migration: all deltas within epsilon (31 results).
- Updated research asset creator to pull cost/exponent/name defaults from in-scene research components when available.

## In Progress
- None

## Next Steps
- If not already done: run `Tools/Idle Dyson/Create Core Research Definitions` to generate research assets + effects.
- If not already done: run `Tools/Idle Dyson/Create Game Data Assets` (or re-run `Create Game Data Registry In Scene`) to create/assign `ResearchDatabase`.
- If not already done: re-run `Tools/Idle Dyson/Create All Skill Definitions + Effects` to refresh skill assets (requirements/exclusives).
- Play-mode sanity check: research costs/labels (definitions applied), auto-buy toggles, panel lifetime upgrades.
- Play-mode sanity check: skill tree purchase/unassign, auto-assign queue, preset save/load, line colors.
- Load an existing save to confirm skill ownership + auto-assign lists migrate correctly.
- Re-run `Debug/Run Facility Parity Suite` and confirm deltas are still zero (including modifier checks).

## Files Touched
- `Assets/Scripts/Data/ResearchIdMap.cs`
- `Assets/Scripts/Systems/Stats/ResearchEffectProvider.cs`
- `Assets/Scripts/Expansion/Oracle.cs`
- `Assets/Scripts/Systems/Facilities/FacilityLegacyBridge.cs`
- `FacilityAndSkillRefactor.md`
- `RefactorProgress.md`
- `Assets/Scripts/Systems/Stats/StatOperation.cs`
- `Assets/Scripts/Systems/Stats/StatEffect.cs`
- `Assets/Scripts/Systems/Stats/Contribution.cs`
- `Assets/Scripts/Systems/Stats/StatResult.cs`
- `Assets/Scripts/Systems/Stats/StatCalculator.cs`
- `Assets/Scripts/Systems/Stats/StatRef.cs`
- `Assets/Scripts/Systems/Stats/StatId.cs`
- `Assets/Scripts/Systems/Stats/SkillEffectCatalog.cs`
- `Assets/Scripts/Systems/Stats/FacilityModifierPipeline.cs`
- `Assets/Scripts/Systems/ProductionSystem.cs`
- `Assets/Scripts/Research/Research.cs`
- `Assets/Scripts/PanelLifetime1.cs`
- `Assets/Scripts/Systems/Stats/GlobalStatPipeline.cs`
- `Assets/Scripts/Systems/ModifierSystem.cs`
- `Assets/Scripts/Systems/GameManager.cs`
- `Assets/Scripts/Data/FacilityDefinition.cs`
- `Assets/Scripts/Data/SkillDefinition.cs`
- `Assets/Scripts/Data/EffectDefinition.cs`
- `Assets/Scripts/Data/ResearchDefinition.cs`
- `Assets/Scripts/Data/FacilityDatabase.cs`
- `Assets/Scripts/Data/SkillDatabase.cs`
- `Assets/Scripts/Data/ResearchDatabase.cs`
- `Assets/Scripts/Systems/Facilities/FacilityState.cs`
- `Assets/Scripts/Systems/Facilities/FacilityBreakdown.cs`
- `Assets/Scripts/Systems/Facilities/FacilityRuntime.cs`
- `Assets/Scripts/Systems/Facilities/FacilityLegacyBridge.cs`
- `Assets/Scripts/Systems/Facilities/FacilityEffectPipeline.cs`
- `Assets/Scripts/Expansion/Oracle.cs`
- `Assets/Scripts/Data/EffectDatabase.cs`
- `Assets/Scripts/Data/GameDataRegistry.cs`
- `Assets/Editor/GameDataAssetCreator.cs`
- `Assets/Scripts/Systems/Stats/StatId.cs`
- `Assets/Scripts/Systems/Stats/SkillEffectProvider.cs`
- `Assets/Scripts/Systems/Stats/SkillFlagAccessor.cs`
- `Assets/Scripts/Data/SkillIdMap.cs`
- `Assets/Scripts/Systems/Stats/GlobalStatPipeline.cs`
- `Assets/Scripts/Systems/Stats/FacilityModifierPipeline.cs`
- `Assets/Scripts/Systems/ModifierSystem.cs`
- `Assets/Scripts/Systems/ProductionSystem.cs`
- `Assets/Editor/GameDataAssetCreator.cs`
- `Assets/Scripts/Research/AssemblyLineUpgrade.cs`
- `Assets/Scripts/Research/AiManagerUpgrade.cs`
- `Assets/Scripts/Research/ServerManagerUpgrade.cs`
- `Assets/Scripts/Research/DataCenterManagerUpgrade.cs`
- `Assets/Scripts/Research/PlanetManagerUpgrade.cs`
- `Assets/Scripts/Research/MoneyMultiUpgrade.cs`
- `Assets/Scripts/Research/ScienceBoostUpgrade.cs`
- `Assets/Scripts/SkillTresStuff/LineManager.cs`
- `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs`
- `Assets/Scripts/SkillTresStuff/SkillsAutoAssignment.cs`
- `Assets/Scripts/SkillTresStuff/SkillTreeConfirmationManager.cs`
- `Assets/Scripts/SkillTresStuff/SkillTreeManager.cs`

## Manual Unity Editor Steps Pending
- If not already done: run `Tools/Idle Dyson/Create Core Research Definitions`.
- If not already done: run `Tools/Idle Dyson/Create Game Data Assets` (or assign `ResearchDatabase` on `GameDataRegistry` manually).
- If not already done: run `Tools/Idle Dyson/Create All Skill Definitions + Effects` after the skill tree migration changes.

## Save Migration Status
- saveVersion: v3 (research levels migration)
- SkillIdMap: runtime mapping added
- Migration steps applied: legacy skill ownership + auto-assign lists -> id-based
- Migration steps applied: legacy research upgrade counts -> `researchLevelsById`

## Validation Status
- Parity checks: Assembly Lines, AI Managers, Servers, Data Centers, Planets matched base formulas and extra modifiers.
- Parity checks: Planet generation matched base formulas.
- Parity checks: Stellar sacrifice bot drain, shoulders-of-the-fallen bonuses, shoulders-of-giants/what-could-have-been accruals matched.
- Parity checks: Facility modifier parity checks run (passed).
- Parity checks: Panel lifetime parity check run (passed).
- Data-driven effects: pipeline validated via parity suite; asset generation still required to fully enable definitions.
- Data-driven effects: shoulders accrual stats + shoulder surgery bonus mapped, assets pending rebuild if not already run.
- Research data scaffolding: definitions/database added; asset generation still required to validate costs in-editor.
- Research data migration: research levels dictionary + pipeline integration in place; parity suite run for global stats.
- Modifier breakdown integration: parity suite re-run after breakdown changes (passed).
- Data-driven facility parity comparisons updated (parity suite re-run passed).
- Offline simulation: not verified
- Breakdown UI: not verified
- Skill tree migration: code updated, needs play-mode validation + migration spot check
- Skill tree migration: play-mode sanity check reported OK, still need migration spot check on older save

## Notes / Blockers
- None
