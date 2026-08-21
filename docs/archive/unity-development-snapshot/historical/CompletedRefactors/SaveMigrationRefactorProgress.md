# Save/Migration Tooling Refactor Progress Tracker

## How to Use
- Update this file after each completed step or phase.
- If interrupted, the next agent should read this file first and resume from the last entry.

## Current Phase
- Phase: Complete
- Owner: Codex
- Date: 2026-01-12

## Last Completed
- Phase E: Cleanup + documentation.
- Added migration registry/runner with dry-run reporting.
- Wired Oracle migrations into the registry and added a debug menu entry.

## In Progress
- None.

## Next Steps
- Run a dry-run using `Tools/Idle Dyson/Debug/Run Save Migration Dry-Run` on an older save.
- Validate apply on a copy if desired.

## Files Touched
- `Assets/Editor/MigrationDebugMenu.cs`
- `Assets/Scripts/Expansion/Oracle.cs`
- `Assets/Scripts/Systems/Migrations/MigrationContext.cs`
- `Assets/Scripts/Systems/Migrations/MigrationRegistry.cs`
- `Assets/Scripts/Systems/Migrations/MigrationRunOptions.cs`
- `Assets/Scripts/Systems/Migrations/MigrationRunResult.cs`
- `Assets/Scripts/Systems/Migrations/MigrationRunner.cs`
- `Assets/Scripts/Systems/Migrations/MigrationSnapshot.cs`
- `Assets/Scripts/Systems/Migrations/MigrationStep.cs`
- `Assets/Scripts/Systems/Migrations/MigrationStepResult.cs`
- `Documentation/SaveMigrationRefactorProgress.md`

## Manual Unity Editor Steps Pending
- Optional: run the dry-run menu command to capture a report.

## Save Migration Status
- Registry includes v2 skill ownership/auto-assign ids migration and v3 research ids migration.
- Ensure step runs after registry to populate derived fields.

## Validation Status
- Dry-run not yet executed.

## Notes / Blockers
- None.
