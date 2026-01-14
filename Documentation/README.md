# Idle Dyson Swarm - Project Documentation

**Project Status:** Active Development - Modernization Complete, Visual Overhaul Phase Next
**Last Updated:** 2026-01-14

---

## Quick Navigation

### 📋 Current State
The codebase modernization is **complete**. The architecture is now solid and ready for new features or visual work.

**Completed Architectural Work:**
- ✅ Phase 1: Typed ID System
- ✅ Phase 2: Scriptable Conditions
- ✅ Phase 3: Service Layer & DI
- ✅ Data-driven facilities, skills, research
- ✅ Save migration framework (version 4)
- ✅ Debug/telemetry tooling

### 📚 Documentation Index

| Document | Purpose | Status |
|----------|---------|--------|
| [OverhaulPlans.md](OverhaulPlans.md) | System improvement tracking | Updated |
| [ArchitecturalImprovementRoadmap.md](ArchitecturalImprovementRoadmap.md) | Phases 1-5 detailed plans | Phases 1-3 Complete |
| [ImplementationOrder.md](ImplementationOrder.md) | Why phases are ordered as they are | Reference |
| [Phase1-TypedIDs-Summary.md](Phase1-TypedIDs-Summary.md) | Typed ID implementation details | Complete |
| [Phase2-ScriptableConditions-Summary.md](Phase2-ScriptableConditions-Summary.md) | Condition system details | Complete |
| [Services README](../Assets/Scripts/Services/README.md) | Service layer documentation | Complete |

### 📦 Archive
- **[Archive/CompletedRefactors/](Archive/CompletedRefactors/)** - Progress logs from completed work
  - Facility & Skill, Research, Save Migration, Debug, Skill Tree refactors

### 🔧 Legacy (Historical Reference)
- [RECCOMMENDATIONS.md](RECCOMMENDATIONS.md) - Original recommendations (completed)
- [FacilityAndSkillRefactor.md](FacilityAndSkillRefactor.md) - Original refactor plan (completed)

---

## Project Context

### Overview
Idle Dyson Swarm is an incremental idle game where players build a Dyson Swarm to produce resources and unlock new technologies. The codebase has been modernized with data-driven architecture, typed IDs, scriptable conditions, and a service layer.

### Architecture Quality: 9.5/10

**Strengths:**
- ✅ Type-safe ID system (compile-time error checking)
- ✅ Data-driven conditions (no code changes for new skills)
- ✅ Service layer with dependency injection (testable)
- ✅ Comprehensive save migration framework
- ✅ Debug tooling and breakdown export
- ✅ Clean stat calculation pipeline

**Optional Future Work:**
- Phase 4: Facility configuration externalization (low priority)
- Offline progress simulation improvements

---

## Current Systems

### Data Layer
- `FacilityDefinition`, `SkillDefinition`, `ResearchDefinition` (ScriptableObjects)
- `FacilityId`, `SkillId`, `ResearchId` (Typed ID assets)
- `GameDataRegistry` (central lookup)

### Service Layer
- `IGameStateService` - Core game state access
- `IGameDataService` - Definition data access
- `IFacilityService` - Facility operations
- `ServiceLocator` - Dependency injection container
- `ServiceProvider` - Auto-registration at startup

### Condition System
- `EffectCondition` base class with composable conditions
- `FacilityCountCondition`, `SkillOwnedCondition`, `ResearchLevelCondition`, etc.
- `AndCondition`, `OrCondition`, `NotCondition` for composition

### Effect System
- `StatEffect` (operation descriptor)
- `EffectConditionEvaluator` (condition checking)
- `SkillEffectProvider`, `ResearchEffectProvider` (effect builders)

### Presentation Layer
- `FacilityBuildingPresenter` (generic facility UI)
- `ResearchPresenter` (research UI)
- `FacilityBreakdownPopup` (detailed breakdown display)

### Migration System
- `MigrationRegistry`, `MigrationRunner` (version management)
- Dry-run mode for safe testing
- Current save version: 4

---

## Development Workflow

### Git Workflow
See [../.claude/git-workflow.md](../.claude/git-workflow.md) for detailed git rules:
- Never work directly on main
- Commit after each phase
- PR for every merge to main
- Verify save compatibility before merging

### For New Features
1. Create feature branch from main
2. Use services for game state access (not Oracle directly)
3. Use typed IDs for facility/skill/research references
4. Use scriptable conditions for unlock logic
5. Test save compatibility with existing saves
6. Create PR when complete

### For AI Agents
- Read relevant documentation before starting work
- Use progress trackers for multi-session work
- Follow git workflow rules in `.claude/git-workflow.md`
- Check Unity console for compilation errors after script changes

---

## Key Resources

### Unity Project Info
- **Unity Version:** 6000.3.0f1 (Unity 6)
- **Target Platform:** PC (Windows/Mac/Linux)
- **Architecture:** Data-driven, ScriptableObject-based

### Important Locations
- `Assets/Scripts/Services/` - Service layer
- `Assets/Scripts/Data/` - Data definitions and typed IDs
- `Assets/Scripts/Data/Conditions/` - Scriptable conditions
- `Assets/Data/` - ScriptableObject assets
- `Assets/Scenes/Game.unity` - Main game scene

### Critical Components
- `Oracle` - Central save data manager (legacy, wrapped by services)
- `GameDataRegistry` - ScriptableObject registry
- `ServiceProvider` - Service registration (must be in scene)

---

## Glossary

**Terms:**
- **Facility:** Building type (Assembly Lines, AI Managers, Servers, Data Centers, Planets)
- **Skill:** Permanent upgrade in skill tree
- **Research:** Repeatable upgrade (costs increase exponentially)
- **Effect:** Stat modifier (additive, multiplicative, etc.)
- **Breakdown:** Detailed calculation trace showing all contributing effects
- **Typed ID:** ScriptableObject-based identifier (FacilityId, SkillId, ResearchId)

---

## Next Steps

The architecture is solid. Potential next directions:

1. **Visual Overhaul** - Modernize UI appearance across all game phases
2. **Reality Content** - Bring reality content up to new visual/architectural standards
3. **Offline Progress** - Improve determinism and debuggability (if needed)
4. **New Features** - Architecture supports easy extension

---

**Last Major Update:** 2026-01-14 (Documentation cleanup, status update)
