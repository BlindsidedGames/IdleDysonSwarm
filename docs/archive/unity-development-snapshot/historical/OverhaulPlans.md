# System Overhaul Plans

**Last Updated:** 2026-01-14
**Status:** Most items complete - see status below

This document outlines candidate system overhauls and their current status.

---

## Completed Overhauls

### ✅ Save/Migration Tooling
- **Status:** Complete (2026-01-12)
- **Progress:** [Archive/CompletedRefactors/SaveMigrationRefactorProgress.md](Archive/CompletedRefactors/SaveMigrationRefactorProgress.md)
- **What was done:**
  - Migration registry with ordered steps and summaries
  - Dry-run validation mode
  - Debug menu entry for testing migrations
  - Current save version: 4

### ✅ Skill Tree UI/Data Overhaul
- **Status:** Complete (2026-01-12)
- **Progress:** [Archive/CompletedRefactors/SkillTreeRefactorProgress.md](Archive/CompletedRefactors/SkillTreeRefactorProgress.md)
- **What was done:**
  - Converted to ID-based ownership system
  - Created `SkillState` dictionary for unified skill data
  - Removed legacy boolean usage from runtime
  - Migration step for legacy saves

### ✅ Debug/Telemetry and Parity Harness
- **Status:** Complete (2026-01-12)
- **Progress:** [Archive/CompletedRefactors/DebugRefactorProgress.md](Archive/CompletedRefactors/DebugRefactorProgress.md)
- **What was done:**
  - `DebugReportRecorder` for breakdown export
  - `StatTimingTracker` for performance monitoring
  - Editor debug menu commands

---

## Pending Overhauls

### 🟡 Offline Progress Simulation
- **Status:** Not Started
- **Priority:** Medium
- **Goal:** Improve determinism, performance, and debuggability of offline/away calculations
- **Scope:**
  - In: Offline simulation step logic, parity harness, reporting UI, deterministic stepping controls
  - Out: Balance changes or formula changes to production/modifiers
- **Proposed Work:**
  - Centralize all offline accumulation into one simulation entry point
  - Add deterministic step sizing options (1s/5s/60s) and a fixed-step test mode
  - Build a compact debug summary panel (before/after totals + deltas)
  - Add a "record/compare" parity snapshot command to validate online vs offline
- **Deliverables:**
  - Single offline simulation module with tunable step sizes
  - Debug results dump + optional UI panel for QA
- **Risks/Notes:**
  - Changes must preserve exact behavior; regression tests required
- **Validation:**
  - Run parity suite at multiple step sizes on a representative save

---

## Architectural Improvements (Separate Track)

These are tracked in [ArchitecturalImprovementRoadmap.md](ArchitecturalImprovementRoadmap.md):

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Typed ID System | ✅ Complete |
| Phase 2 | Scriptable Conditions | ✅ Complete |
| Phase 3 | Service Layer & DI | ✅ Complete |
| Phase 4 | Facility Configuration | 🟡 Optional/Deferred |
| Phase 5 | Polish & Optimization | 🟢 As-needed |

---

## Future Considerations

Items that may become relevant as the project evolves:

1. **UI Visual Overhaul** - Modernize game appearance across all phases
2. **Reality Content Integration** - Bring reality content up to new standards
3. **Performance Profiling** - Only if bottlenecks are identified
4. **Modding Support** - If community interest warrants it

---

**Document Version:** 2.0
**Previous Version:** Archived implicitly via git history
