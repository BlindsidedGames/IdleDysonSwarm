# Skill Tree Refactor Plan (Data-Driven UI + State)

## Goals
- Make `SkillDefinition` the single source of truth for names, descriptions, costs, prerequisites, and exclusives.
- Replace legacy int keys/bools with id-based skill state (owned/levels/timers) in save data.
- Simplify skill tree UI to a generic presenter with consistent data binding.
- Preserve save compatibility through `SkillIdMap` and migration fallbacks.

## Non-Goals
- Visual redesign of the skill tree layout.
- Balance changes to costs, effects, or progression.
- New skill effects or new skill types.

## Current Pain Points (Summary)
- Skill ownership is spread across legacy bool fields and int-key dictionaries.
- `SkillTreeManager` and related UI scripts use legacy `SkillTreeItem` data directly.
- Auto-assign and confirmation logic rely on legacy keys, making migrations brittle.
- UI binding is partly manual and hard to validate at scale.

## Proposed Architecture
- **Skill state model**
  - Introduce `Dictionary<string, SkillState>` in save data (owned, levels, timers, flags).
  - Provide legacy fallback mapping via `SkillIdMap` for existing saves.
- **Generic UI presenter**
  - `SkillNodePresenter` binds to a `SkillDefinition` and UI references.
  - Reads state from the id-based dictionary and writes updates via a central accessor.
- **Graph validation**
  - A validator checks for missing ids, broken prerequisite/exclusive links, and duplicates.
  - Optional editor report to surface issues early.

## Data Requirements
- `SkillDefinition` must own: `id`, `displayName`, `description`, `technicalDescription`, `cost`, `refundable`,
  `isFragment`, `requiredSkillIds`, `exclusiveWithIds`, `unrefundableWithIds`, plus any tag/group metadata.
- Optional layout metadata: store node positions/rows in a separate `SkillTreeLayout` ScriptableObject.
- Track progress in `Documentation/SkillTreeRefactorProgress.md`.

## Implementation Phases

### Phase A: Inventory + Mapping
- Enumerate `SkillTreeItem` legacy keys and map to `SkillDefinition` ids (via `SkillIdMap`).
- Identify every UI node using `SkillTreeManager` / `LineManager` / `SkillTreeConfirmationManager`.
- Confirm which skills have timers or special behaviors (androids, scatter, etc).

### Phase B: State Model + Migration
- Add `skillStateById` (id -> state) to save data.
- In `Oracle.WipeSaveData`, initialize empty dictionaries with defaults.
- Add migration step to populate `skillStateById` from:
  - legacy bool fields on `DysonVerseSkillTreeData`
  - legacy `SkillTreeSaveData` (int-key dictionary)
- Keep legacy fields for compatibility until validation is stable.

### Phase C: Generic UI Presenter + Binding
- Add `SkillNodePresenter` to display:
  - name, description, cost, owned status, requirement status
  - tooltips/confirmation data from `SkillDefinition`
- Use a single accessor to query/update `skillStateById`.
- Ensure prerequisites/exclusives are checked against id state.

### Phase D: Replace Legacy UI/Logic
- Update:
  - `SkillTreeManager.cs`, `SkillTreeConfirmationManager.cs`, `LineManager.cs`
  - `SkillsAutoAssignment.cs`, `SetSkillsOnOracle.cs`, `SkillTreeSettingsManager.cs`
- Remove reliance on `SkillTreeItem` data for UI text and ownership.
- Keep a compatibility bridge for a release or two.

### Phase E: Cleanup + Removal
- Remove or deprecate legacy bool fields and int-key dictionaries once migration passes.
- Update documentation and the progress tracker.

## Validation Checklist
- Load a legacy save and verify ownership matches previous behavior.
- Confirm prerequisites/exclusive rules block/unblock correctly.
- Validate auto-assign lists still work and remain id-based.
- Confirm skill timers (androids/scatter/etc) still tick and display correctly.
- No missing references or nulls in skill tree UI.

## Risks + Mitigations
- **Risk**: ID mapping mismatch causes lost ownership.
  - Mitigation: Run a migration report that prints counts by id and legacy key.
- **Risk**: UI nodes show incorrect requirement state.
  - Mitigation: Add a debug overlay showing unmet prerequisites/exclusive conflicts.
- **Risk**: Performance regressions from frequent dictionary lookups.
  - Mitigation: Cache state snapshots per UI refresh frame.

## Estimated Touch Points
- `Assets/Scripts/Expansion/Oracle.cs` (save init + migration)
- `Assets/Scripts/Expansion/Oracle.cs` nested `DysonVerseSkillTreeData`
- `Assets/Scripts/SkillTresStuff/SkillTreeManager.cs`
- `Assets/Scripts/SkillTresStuff/SkillTreeConfirmationManager.cs`
- `Assets/Scripts/SkillTresStuff/LineManager.cs`
- `Assets/Scripts/SkillTresStuff/SkillsAutoAssignment.cs`
- `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs`
- `Assets/Scripts/Systems/Stats/SkillEffectProvider.cs`
- `Assets/Scripts/Systems/Stats/SkillFlagAccessor.cs`
- New: `Assets/Scripts/Systems/Skills/SkillNodePresenter.cs` (or similar)

## Acceptance Criteria
- Skill tree UI is fully driven by `SkillDefinition` data.
- No runtime logic depends on legacy bool fields for ownership checks.
- Existing saves load without regression (ownership, prerequisites, timers).
- Auto-assign and confirmation flows operate correctly with id-based state.
