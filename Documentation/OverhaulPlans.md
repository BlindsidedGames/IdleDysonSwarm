# System Overhaul Plans

This document outlines candidate system overhauls and proposed approaches. Pick one to expand into a full task plan.

## 1) Offline Progress Simulation
- Goal: Improve determinism, performance, and debuggability of offline/away calculations.
- Scope:
  - In: Offline simulation step logic, parity harness, reporting UI, deterministic stepping controls.
  - Out: Balance changes or formula changes to production/modifiers.
- Proposed Work:
  - Centralize all offline accumulation into one simulation entry point (remove scattered increments).
  - Add deterministic step sizing options (1s/5s/60s) and a fixed-step test mode.
  - Build a compact debug summary panel (before/after totals + deltas).
  - Add a "record/compare" parity snapshot command to validate online vs offline.
- Deliverables:
  - Single offline simulation module with tunable step sizes.
  - Debug results dump + optional UI panel for QA.
- Risks/Notes:
  - Changes must preserve exact behavior; regression tests required.
- Validation:
  - Run parity suite at multiple step sizes on a representative save.

## 2) Save/Migration Tooling
- Goal: Make migrations visible, testable, and safer.
- Scope:
  - In: Migration registry, save version inspector, diagnostics.
  - Out: New migration logic beyond current needs.
- Proposed Work:
  - Introduce a migration registry with ordered steps and summaries.
  - Add an editor or in-game debug inspector for migration state.
  - Add one-click “dry run” validation that reports diffs (skills/research counts).
- Deliverables:
  - `MigrationRegistry` + UI/console reporting for verification.
- Plan:
  - `Documentation/SaveMigrationOverhaulPlan.md`
- Risks/Notes:
  - Must not mutate production saves when in dry-run mode.
- Validation:
  - Validate with at least one older save; ensure no silent data loss.

## 3) Skill Tree UI/Data Overhaul
- Goal: Fully data-drive the skill tree, remove remaining legacy bools and int keys.
- Scope:
  - In: Skill node definitions, ownership state, prerequisites, exclusive groups, UI binding.
  - Out: Visual redesign of the tree layout (unless desired).
- Proposed Work:
  - Convert `SkillTreeManager` node setup to be driven entirely by `SkillDefinition` data.
  - Remove residual `DysonVerseSkillTreeData` bool usage from runtime.
  - Centralize skill state (owned/level/timers) in id-based dictionaries only.
  - Add validation checks for missing/duplicate skill IDs and broken links.
- Deliverables:
  - Single source of truth for skill definitions and state.
  - Cleaner migration path for future skills.
- Plan:
  - `Documentation/SkillTreeRefactorPlan.md`
- Risks/Notes:
  - Must preserve existing saves via id mapping and migration fallback.
- Validation:
  - Load a legacy save; verify skill ownership, auto-assign lists, and prerequisites.

## 4) Debug/Telemetry and Parity Harness
- Goal: Reduce time-to-debug by exposing important stats and parity results.
- Scope:
  - In: Debug console tooling, breakdown export, parity harness controls.
  - Out: Third-party telemetry services.
- Proposed Work:
  - Add in-game toggles for breakdown overlays and parity suite execution.
  - Export last breakdown/parity output to a temp file for quick sharing.
  - Add a lightweight performance timer around the stat pipeline.
- Deliverables:
  - Debug UI panel + log export commands.
- Plan:
  - `Documentation/DebugOverhaulPlan.md`
- Risks/Notes:
  - Keep debug-only features behind a flag.
- Validation:
  - Manual run on a large save; ensure minimal overhead when disabled.
