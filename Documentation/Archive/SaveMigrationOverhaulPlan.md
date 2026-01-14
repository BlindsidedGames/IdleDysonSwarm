# Save/Migration Tooling Overhaul Plan (Registry + Diagnostics)

## Goals
- Make save migrations visible, testable, and safer to run.
- Provide a single registry for ordered migrations and their summaries.
- Add a dry-run mode that reports what would change without mutating data.
- Reduce manual inspection time for migration regressions.

## Non-Goals
- Changing game balance or save schema beyond tooling support.
- Removing legacy save fields before validation is proven.
- Building a full UI redesign (keep tooling minimal and dev-focused).

## Current Pain Points (Summary)
- Migrations are embedded in `Oracle.ApplyMigrations` with limited visibility.
- No centralized list of applied migrations or change summaries.
- Hard to compare before/after state without bespoke logs.
- Risk of silent data loss on older saves.

## Proposed Architecture
- **Migration Registry**
  - `MigrationRegistry` defines ordered `MigrationStep`s (version, name, summary, apply, validate).
  - Each step can produce a report of changes (counts, ids, totals).
- **Dry-Run Diagnostics**
  - `MigrationRunner` supports `dryRun=true` to validate steps without mutation.
  - Reports summary to console (or debug UI) with per-step results.
- **Save Versioning**
  - Keep `CurrentSaveVersion` in `Oracle.cs`.
  - Migrations are applied in registry order when `saveVersion < targetVersion`.

## Data Requirements
- Save data entry point remains `Oracle.SaveDataSettings`.
- Legacy fields stay intact until migration checks pass for multiple saves.
- Registry should reference `Documentation/SaveMigrationRefactorProgress.md`.

## Implementation Phases

### Phase A: Inventory + Requirements
- Catalog existing migration logic in `Oracle.ApplyMigrations`.
- Identify all migration-like behaviors elsewhere (load-time fixes, defaulting).
- Define what "diff" should include for dry-run (skills/research counts, lists).

### Phase B: Registry + Runner
- Create `MigrationStep` (version, name, apply, validate, summary).
- Create `MigrationRegistry` with ordered steps.
- Implement `MigrationRunner` that:
  - runs steps in order
  - supports `dryRun` and `apply`
  - logs summary and per-step results

### Phase C: Wire Into Oracle
- Replace or wrap `Oracle.ApplyMigrations` to use the registry.
- Keep legacy fallbacks for safe migration.
- Ensure `CurrentSaveVersion` is updated only on successful apply.

### Phase D: Diagnostics + Reporting
- Add a debug entry point (menu item or console command) to run dry-run.
- Add structured output for key categories:
  - skill ownership counts, research levels, auto-assign ids, timers

### Phase E: Cleanup + Documentation
- Update documentation and tracker.
- Remove obsolete inline migration code after registry is stable.

## Validation Checklist
- Run dry-run on a known old save and capture report.
- Run apply on a copy and confirm summary changes.
- Ensure no mutation happens in dry-run.
- Verify no missing data on load after apply.

## Risks + Mitigations
- **Risk**: False positives in diff reporting.
  - Mitigation: Keep summaries high level and include counts and ids.
- **Risk**: Accidental mutation in dry-run.
  - Mitigation: Ensure apply paths are guarded; use explicit clone when possible.
- **Risk**: Step ordering mistakes.
  - Mitigation: Enforce monotonic version order with validation.

## Estimated Touch Points
- `Assets/Scripts/Expansion/Oracle.cs`
- New: `Assets/Scripts/Systems/Migrations/MigrationRegistry.cs`
- New: `Assets/Scripts/Systems/Migrations/MigrationRunner.cs`
- New: `Assets/Scripts/Systems/Migrations/MigrationStep.cs`
- Optional: `Assets/Editor/MigrationDebugMenu.cs`

## Acceptance Criteria
- A migration registry exists with ordered steps and summaries.
- Dry-run reports are reliable and non-mutating.
- Save version updates only after successful apply.
- Existing saves load without regression.
