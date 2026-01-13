# Idle Dyson Swarm - Project Documentation

**Project Status:** Active Development - Modernization Phase
**Last Updated:** 2026-01-13

---

## Quick Navigation

### 📋 Current Work
- **[Architectural Improvement Roadmap](ArchitecturalImprovementRoadmap.md)** ⭐ START HERE
  - Post-refactor hardening plan
  - Eliminates fragility, increases extensibility
  - 4-week implementation roadmap with prioritization

### 📚 Active Plans
- **[Overhaul Plans](OverhaulPlans.md)**
  - High-level system improvement candidates
  - Research, Save Migration, Skill Tree, Debug/Telemetry systems
- **[Facility & Skill Refactor Plan](FacilityAndSkillRefactor.md)**
  - Detailed plan for data-driven architecture (COMPLETED)
- **[Research Overhaul Plan](ResearchOverhaulPlan.md)**
  - Research system data-driven migration plan
- **[Save Migration Overhaul Plan](SaveMigrationOverhaulPlan.md)**
  - Migration registry and dry-run system design
- **[Debug Overhaul Plan](DebugOverhaulPlan.md)**
  - Debug tooling and telemetry improvements
- **[Skill Tree Refactor Plan](SkillTreeRefactorPlan.md)**
  - Skill tree data-driven migration plan

### 📦 Archive
- **[Archive/CompletedRefactors/](Archive/CompletedRefactors/)**
  - Progress logs from completed refactoring work
  - Facility & Skill, Research, Save Migration, Debug, Skill Tree progress trackers

### 🔧 Legacy Recommendations
- **[RECCOMMENDATIONS.md](RECCOMMENDATIONS.md)**
  - Original refactor recommendations (mostly completed)
  - Kept for historical reference

---

## Project Context

### Overview
Idle Dyson Swarm is an incremental idle game where players build a Dyson Swarm to produce resources and unlock new technologies. This is one of the oldest active projects and is currently undergoing modernization to bring it up to current standards.

### Recent Accomplishments (Completed by Codex)

**Phase: Data-Driven Architecture Refactor** ✅
- **Duration:** ~3 weeks
- **Status:** Complete (saveVersion 4)
- **Impact:** Transformed hardcoded production logic into extensible data-driven system

**Key Achievements:**
1. **Facility System Refactor**
   - Created ScriptableObject-based definitions for facilities, skills, research
   - Built stat calculation pipeline with full auditability (Contribution tracking)
   - Collapsed 5 manager classes into single `FacilityBuildingPresenter`
   - Added breakdown UI showing all modifiers and calculations
   - **Validation:** 31 parity checks passing (deltas within epsilon)

2. **Research System Refactor**
   - Converted research to data-driven `ResearchDefinition` assets
   - Created `ResearchPresenter` replacing 7 legacy upgrade scripts
   - Added research effect pipeline integrated with facility modifiers
   - Implemented auto-buy groups with chained prerequisites

3. **Skill Tree Refactor**
   - Migrated from boolean-based to ID-based ownership system
   - Created `SkillState` dictionary for unified skill data
   - Updated UI to pull from `SkillDefinition` assets
   - Added skill effect provider for data-driven bonuses

4. **Save Migration System**
   - Built `MigrationRegistry` and `MigrationRunner` framework
   - Added dry-run mode for safe migration testing
   - Implemented version tracking (currently saveVersion 4)
   - Created debug menu entries for testing migrations

5. **Debug/Telemetry System**
   - Added `DebugReportRecorder` for exporting breakdowns
   - Implemented `StatTimingTracker` for performance monitoring
   - Created editor menu commands for debug operations

**Files Impacted:** 80+ files touched
- **Deleted:** 5 legacy manager scripts, 7 research upgrade scripts
- **Added:** Stats pipeline, Facilities system, Migration framework
- **Updated:** Data definitions, presenters, production systems

**Code Quality Improvements:**
- Renamed cryptic identifiers (dvid, dvpd, dvst, pp) to descriptive names
- Reduced code duplication
- Centralized calculations
- Separated pure functions from MonoBehaviour

### Current State

**Architecture Quality: 8.5/10**
- ✅ Solid data-driven foundations
- ✅ Comprehensive parity testing
- ✅ Clean stat calculation system
- ⚠️ String-based IDs create fragility
- ⚠️ Hardcoded conditions limit extensibility
- ⚠️ Tight coupling to static global state

### Next Phase: Architectural Hardening

**Goal:** Eliminate fragility and technical debt before new features
**Plan:** See [Architectural Improvement Roadmap](ArchitecturalImprovementRoadmap.md)

**Priority Changes:**
1. **String IDs → Typed ID Assets** (Week 1) - Prevents 80% of future bugs
2. **Hardcoded Conditions → Scriptable Conditions** (Week 2) - Unlocks designer autonomy
3. **Static Coupling → Dependency Injection** (Week 3) - Enables unit testing
4. **Switch Statements → Configuration** (Week 4) - New facilities require zero code

---

## Development Workflow

### For Developers

**Starting New Work:**
1. Read [Architectural Improvement Roadmap](ArchitecturalImprovementRoadmap.md) for current priorities
2. Check [OverhaulPlans.md](OverhaulPlans.md) for major system candidates
3. Create progress tracker: `Documentation/<Feature>Progress.md`
4. Update progress tracker after each phase

**Resuming Work:**
1. Read relevant `<Feature>Progress.md` in [Archive/CompletedRefactors/](Archive/CompletedRefactors/)
2. Check "Last Completed" and "Next Steps" sections
3. Continue from last checkpoint

**Completing Work:**
1. Update progress tracker with final status
2. Run validation checklist
3. Move progress tracker to archive
4. Update this README

### For AI Agents

**Context Preservation:**
- Always read progress trackers before resuming work
- Update progress tracker after each phase (survives context limits)
- Track: current phase, last completed step, files touched, manual steps, validation status

**Progress Tracker Template:**
```markdown
## Current Phase
- Phase: <name>
- Owner: <agent/developer>
- Date: <date>

## Last Completed
- <list of completed steps>

## In Progress
- <current work>

## Next Steps
- <what to do next>

## Files Touched
- <list of modified files>

## Validation Status
- <parity checks, tests run, etc.>
```

---

## Architecture Overview

### Current Systems (Post-Refactor)

**Data Layer:**
- `FacilityDefinition`, `SkillDefinition`, `ResearchDefinition` (ScriptableObjects)
- `FacilityDatabase`, `SkillDatabase`, `ResearchDatabase` (registries)
- `GameDataRegistry` (central lookup)

**Runtime Layer:**
- `FacilityState`, `SkillState`, `ResearchState` (persistent data)
- `FacilityRuntime`, `FacilityBreakdown` (calculated values)
- `StatCalculator` (pure calculation engine)

**Effect System:**
- `StatEffect` (operation descriptor)
- `EffectConditionEvaluator` (condition checking)
- `SkillEffectProvider`, `ResearchEffectProvider` (effect builders)

**Presentation Layer:**
- `FacilityBuildingPresenter` (generic facility UI)
- `ResearchPresenter` (research UI)
- `FacilityBreakdownPopup` (detailed breakdown display)

**Migration System:**
- `MigrationRegistry`, `MigrationRunner` (version management)
- `MigrationStep` (migration definition)
- Current save version: 4

### Known Technical Debt

See [Architectural Improvement Roadmap](ArchitecturalImprovementRoadmap.md) for detailed analysis and solutions:

1. **String-Based IDs** (HIGH PRIORITY)
   - Fragile, error-prone, no compile-time checks
   - Solution: Strongly-typed ID assets

2. **Hardcoded Conditions** (HIGH PRIORITY)
   - 70+ switch cases in EffectConditionEvaluator
   - Solution: Scriptable condition framework

3. **Static Global Coupling** (MEDIUM PRIORITY)
   - Presenters access Oracle.Instance directly
   - Solution: Dependency injection with service layer

4. **Configuration in Code** (MEDIUM PRIORITY)
   - Facility mappings in switch statements
   - Solution: External configuration assets

---

## Testing Strategy

### Current Testing
- **Parity Tests:** Manual suite comparing old vs new systems
  - Facilities: 5 types tested
  - Modifiers: All combinations tested
  - Global stats: Money/science/panels tested
  - **Result:** All deltas within epsilon ✅

- **Play Testing:** Informal validation
  - Skill tree interactions
  - Research purchases
  - Facility production
  - Save/load cycles

### Planned Testing (Phase 3)
- **Unit Tests:** Service layer with mocks
- **Integration Tests:** Scene-level validation
- **Automated Parity Tests:** CI/CD pipeline

---

## File Organization

```
Documentation/
├── README.md                              # This file
├── ArchitecturalImprovementRoadmap.md     # Current priority work
├── OverhaulPlans.md                       # System improvement candidates
├── FacilityAndSkillRefactor.md            # Detailed refactor plan (completed)
├── ResearchOverhaulPlan.md                # Research system plan
├── SaveMigrationOverhaulPlan.md           # Migration system plan
├── DebugOverhaulPlan.md                   # Debug tooling plan
├── SkillTreeRefactorPlan.md               # Skill tree plan
├── RECCOMMENDATIONS.md                    # Legacy recommendations
└── Archive/
    └── CompletedRefactors/
        ├── FacilityAndSkillRefactorProgress.md
        ├── ResearchRefactorProgress.md
        ├── SaveMigrationRefactorProgress.md
        ├── DebugRefactorProgress.md
        └── SkillTreeRefactorProgress.md
```

---

## Key Resources

### Unity Project Info
- **Unity Version:** 6000.3.0f1 (Unity 6)
- **Target Platform:** PC (Windows/Mac/Linux)
- **Architecture:** Data-driven, ScriptableObject-based

### External Dependencies
- **Save System:** ES3 (Easy Save 3) or Odin Serialization
- **UI Framework:** Unity UI (uGUI)
- **Asset Management:** Addressables (if applicable)

### Important Scenes
- `Assets/Scenes/Game.unity` - Main game scene

### Critical Singletons
- `Oracle` - Central save data manager
- `GameDataRegistry` - ScriptableObject registry
- `GameManager` - Game loop orchestrator

---

## Glossary

**Terms:**
- **Facility:** Building type (Assembly Lines, AI Managers, Servers, Data Centers, Planets)
- **Skill:** Permanent upgrade in skill tree
- **Research:** Repeatable upgrade (costs increase exponentially)
- **Effect:** Stat modifier (additive, multiplicative, etc.)
- **Breakdown:** Detailed calculation trace showing all contributing effects
- **Parity:** Equivalence between old and new system outputs
- **Migration:** Save data version upgrade process

**Acronyms (Legacy):**
- **dvid:** DysonVerseInfinityData (renamed to InfinityData)
- **dvpd:** DysonVersePrestigeData (renamed to PrestigeData)
- **dvst:** DysonVerseSkillTreeData (renamed to SkillTreeData)
- **pp:** PrestigePlus (now explicit)

---

## Contact & Contribution

**Project Owner:** mattr
**Current Phase Lead:** Claude (Sonnet 4.5) / Codex
**Status:** Active Development

**Contributing:**
- Follow progress tracker workflow
- Update documentation after changes
- Run validation before committing
- Preserve backward compatibility during refactors

---

**Last Major Update:** 2026-01-13 (Documentation reorganization + improvement roadmap)
**Next Review:** After Phase 1 completion (Typed IDs)
