# Codebase Analysis - January 2026

**Date:** 2026-01-14
**Purpose:** Deep dive analysis to identify improvement areas before visual overhaul
**Author:** Claude (Opus 4.5)

---

## Executive Summary

The codebase is in good architectural shape (9.5/10) after completing Phases 1-3 of modernization. However, there are structural issues and technical debt that should be addressed **before** starting a visual overhaul to avoid complications.

**Key Finding:** The architecture is solid, but the **code organization** and **UI structure** need cleanup work.

---

## Project Statistics

| Metric | Count |
|--------|-------|
| C# Scripts | 182 files |
| Lines of Code | ~23,600 |
| ScriptableObject Assets | 600+ |
| Prefabs | 29 |
| Scenes | 2 (Game, Load) |

---

## Critical Issues to Address

### 1. Root-Level Script Chaos (34 files)

**Problem:** 34 scripts sitting at `Assets/Scripts/` root instead of organized folders.

**Impact:** Hard to navigate, namespace pollution, blocks refactoring.

**Files that need moving:**
- UI-related: `AutoBotsToggles.cs`, `CanvasController.cs`, `PrestigeFillBar.cs`
- Game systems: `InfinityManager.cs`, `OfflineTimeManager.cs`, `StoryManager.cs`
- Debug: `DebugPurchaseHandler.cs` (should be in Systems/Debugging)
- Naming violations: `desktopDisabler.cs`, `disclaimerDisabler.cs` (wrong casing)
- Typo: `ScreenSafeRea.cs` (should be `ScreenSafeArea.cs`)

**Recommendation:** Create subfolders and reorganize before visual work.

### 2. Duplicate Utility Classes (4 sets)

**Problem:** Same utilities exist in multiple locations.

| Utility | Location 1 | Location 2 |
|---------|-----------|-----------|
| `SlicedFilledImage.cs` | Systems/ | Blindsided/Utilities/ |
| `CalcUtils.cs` | Systems/ | Blindsided/Utilities/ |
| `FlexibleGridLayout.cs` | Systems/ | Blindsided/Utilities/ |
| `CategoryStateSaver.cs` | Blindsided/Utilities/ | User Interface/ |

**Recommendation:** Consolidate to single location, delete duplicates.

### 3. Typos in Names

| Current | Should Be |
|---------|-----------|
| `SkillTresStuff/` folder | `SkillTreeStuff/` |
| `ScreenSafeRea.cs` | `ScreenSafeArea.cs` |
| `desktopDisabler.cs` | `DesktopDisabler.cs` |
| `disclaimerDisabler.cs` | `DisclaimerDisabler.cs` |

### 4. No Theme System

**Problem:** Colors are hardcoded in Oracle class (`Oracle.textColourBlue`, etc.). Cannot easily theme the UI.

**Recommendation:** Extract colors/fonts/spacing to ScriptableObject theme assets.

### 5. SidePanelManager Monolith

**Problem:** `SidePanelManager.cs` manages Infinity, Prestige, AND Reality in one 200+ line Update loop.

**Recommendation:** Split into three separate managers for each system.

---

## Service Layer Adoption Status

Only **2 of 75+ presenters** have been migrated to use the service layer:
- ✅ `FacilityBuildingPresenter.cs`
- ✅ `ResearchPresenter.cs`
- ❌ 73+ other files still use `Oracle` directly

This is fine for now - migrate additional presenters as you touch them during visual work.

---

## Reality Content Structure

Reality is the end-game system (post-Infinity). Currently scattered across:

| Component | File | Notes |
|-----------|------|-------|
| Core Logic | `InceptionController.cs` | Worker generation, influence |
| Progress Bar | `ToRealityFillbar.cs` | 42 IP threshold display |
| UI Management | `SidePanelManager.cs` | Tab visibility, mixed with other systems |
| Data | `Oracle.cs` | `workersReadyToGo`, `influence`, `universesConsumed` |

**For Visual Overhaul:** Reality should be extracted to its own folder and have dedicated UI prefabs.

---

## Dream1 (Expansion) Content

Dream1 represents progression through historical eras:
- Foundational Era (Hunter-gatherer)
- Information Era
- Space Age
- Simulation disasters trigger prestige

Located in `Expansion/Dream1/` - reasonably organized but uses hardcoded unlock logic.

---

## Prefab Organization

Current prefabs are minimal and poorly organized:
- Only 3 building prefabs
- No Reality/Prestige/Infinity section prefabs
- Unclear naming (`------.prefab`)
- No variant system for responsive layouts

**For Visual Overhaul:** Need to create a proper prefab structure with UI section prefabs.

---

## Recommendations by Priority

### Must Do Before Visual Overhaul (15-20 hours)

| Task | Effort | Impact |
|------|--------|--------|
| Reorganize 34 root scripts into folders | 2-3 hrs | High - navigation |
| Consolidate duplicate utilities | 1-2 hrs | High - maintenance |
| Fix naming typos | 30 min | Low - quality |
| Create basic theme system | 4-6 hrs | High - consistency |
| Split SidePanelManager | 8-10 hrs | Medium - testability |

### During Visual Overhaul

| Task | Effort | Impact |
|------|--------|--------|
| Create UI prefab structure | 6-8 hrs | High - iteration speed |
| Extract Reality to own folder | 3-4 hrs | Medium - organization |
| Theme all UI components | Varies | High - visual consistency |
| Build responsive prefab variants | 4-6 hrs | Medium - mobile support |

### Nice to Have (Later)

| Task | Effort | Impact |
|------|--------|--------|
| Complete service layer migration | 20+ hrs | Medium - testability |
| Data-drive Dream1 unlocks | 4-6 hrs | Low - flexibility |
| Comprehensive test suite | 10+ hrs | Medium - confidence |

---

## Recommended Folder Structure

```
Assets/Scripts/
├── Core/                    # Core game mechanics
│   ├── InfinityManager.cs
│   ├── OfflineTimeManager.cs
│   └── ...
├── UI/                      # All UI code
│   ├── Core/               # Base classes, theme
│   │   ├── UITheme.cs
│   │   └── UIPresenter.cs
│   ├── Panels/             # Main panel controllers
│   │   ├── InfinityPanel/
│   │   ├── PrestigePanel/
│   │   └── RealityPanel/
│   └── Components/         # Reusable UI components
├── Systems/                 # (existing - keep)
│   ├── Debugging/
│   ├── Facilities/
│   ├── Migrations/
│   ├── Reality/            # NEW - extract Reality here
│   ├── Skills/
│   └── Stats/
├── Services/               # (existing - keep)
├── Data/                   # (existing - keep)
└── Expansion/              # (existing - keep)
```

---

## Visual Overhaul Readiness

| Area | Ready? | Blocker |
|------|--------|---------|
| Architecture | ✅ Yes | None |
| Data Layer | ✅ Yes | None |
| Code Organization | ❌ No | Root scripts, duplicates |
| UI Structure | ❌ No | No prefabs, no theme |
| Reality Content | 🟡 Partial | Scattered across files |
| Dream1 Content | ✅ Yes | Reasonably organized |

**Overall:** Need ~15-20 hours of prep work before visual overhaul will go smoothly.

---

## Next Steps

1. **Create cleanup branch** - Reorganize scripts, fix typos, consolidate duplicates
2. **Create theme system** - Extract colors/fonts to ScriptableObject
3. **Split SidePanelManager** - Separate Infinity/Prestige/Reality
4. **Begin visual overhaul** - With solid foundation in place

---

**Document Status:** Complete
**Related PR:** chore/documentation-cleanup (this analysis)
