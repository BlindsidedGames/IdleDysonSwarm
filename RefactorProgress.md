# Refactor Progress Tracker

## How to Use
- Update this file after each completed step or phase.
- If interrupted, the next agent should read this file first and resume from the last entry.

## Current Phase
- Phase: Preparation / Save safety scaffolding
- Owner: Codex
- Date: 2026-01-10

## Last Completed
- Added save gating and autosave scheduling guardrails in `Assets/Scripts/Expansion/Oracle.cs`.
- Added saveVersion + migration scaffolding fields and hooks.
- Added RefactorProgress tracking instructions in `FacilityAndSkillRefactor.md`.

## In Progress
- None

## Next Steps
- Begin Phase 1 (data + stat pipeline scaffolding).

## Files Touched
- `Assets/Scripts/Expansion/Oracle.cs`
- `FacilityAndSkillRefactor.md`
- `RefactorProgress.md`

## Manual Unity Editor Steps Pending
- None

## Save Migration Status
- saveVersion: field added, migration hook runs on load
- SkillIdMap: not created
- Migration steps applied: none (stub only)

## Validation Status
- Parity checks: not run
- Offline simulation: not verified
- Breakdown UI: not verified

## Notes / Blockers
- None
