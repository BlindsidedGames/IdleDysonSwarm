# Skill Tree Refactor Progress Tracker

## How to Use
- Update this file after each completed step or phase.
- If interrupted, the next agent should read this file first and resume from the last entry.

## Current Phase
- Phase: Complete
- Owner: Codex
- Date: 2026-01-12

## Last Completed
- Removed legacy `SkillTreeItem` dependencies from core skill tree UI scripts.
- Shifted skill tree UI/auto-assign/line logic to `SkillDefinition` + id-based ownership.
- Introduced `SkillState` dictionary and wired ownership access to use it.
- Added migration step to populate skill state from legacy ownership/timers.
- Bumped `CurrentSaveVersion` to 4 for skill state migration.
- Migrated skill timers to `SkillState` and removed legacy timer usage from runtime paths.
- Validated skill tree UI with current scene wiring.
- Confirmed skill state migration on an older save.

## In Progress
- None.

## Next Steps
- None.

## Files Touched
- `Assets/Scripts/Expansion/Oracle.cs`
- `Assets/Scripts/SkillTresStuff/LineManager.cs`
- `Assets/Scripts/SkillTresStuff/SkillsAutoAssignment.cs`
- `Assets/Scripts/SkillTresStuff/SkillTreeConfirmationManager.cs`
- `Assets/Scripts/SkillTresStuff/SkillTreeManager.cs`
- `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs`
- `Assets/Scripts/Systems/Skills/SkillState.cs`
- `Assets/Scripts/Systems/Stats/SkillEffectProvider.cs`
- `Assets/Scripts/Systems/Migrations/MigrationSnapshot.cs`
- `Documentation/SkillTreeRefactorPlan.md`
- `Documentation/SkillTreeRefactorProgress.md`

## Manual Unity Editor Steps Pending
- None.

## Validation Status
- Complete.

## Notes / Blockers
- None.
