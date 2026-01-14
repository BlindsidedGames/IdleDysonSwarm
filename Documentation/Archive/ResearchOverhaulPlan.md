# Research Overhaul Plan (Data-Driven UI + Auto-Buy)

## Goals
- Replace per-research subclasses with a single generic presenter driven by `ResearchDefinition`.
- Make research UI/auto-buy behavior consistent and data-driven (costs, names, auto-buy rules).
- Keep behavior identical (no balance or formula changes).
- Preserve save compatibility (continue using `researchLevelsById`, with legacy fallbacks).

## Non-Goals
- Adding new research effects or changing effect math.
- Changing research buy modes (`Buy1/10/50/100/Max`) beyond refactoring.
- Visual redesign of the research UI.

## Current Pain Points (Summary)
- One-off scripts (`AssemblyLineUpgrade`, `ServerManagerUpgrade`, `PanelLifetime1`, etc.) are hard-coded.
- Auto-buy logic is scattered and hard-wired to specific scripts.
- Panel lifetime upgrades are handled with bespoke UI and bool flags.
- Research UI values partly come from `ResearchDefinition`, but interaction logic does not.

## Proposed Architecture
- **`ResearchPresenter` (new, generic)**:
  - Serialized fields: `ResearchDefinition definition`, `BuildingReferences ui`, optional `autoBuyGroup`.
  - Handles: cost text, owned text, production text, buy logic, buy-mode amounts, auto-buy eligibility.
  - Uses `ResearchDefinition` for `baseCost`, `exponent`, `displayName`, `maxLevel`, and effects list.
  - Reads/updates level via `researchLevelsById` with legacy fallback.
- **Auto-buy controller (new or refactored `ResearchAutoBuy`)**:
  - Iterates all research presenters or all `ResearchDefinition`s with presenters.
  - Applies global `prestigeData.infinityAutoResearch` plus category toggle checks.
- **Panel lifetime upgrades**:
  - Treat as normal research with `maxLevel = 1`.
  - Presenter should display “Purchased” when `CurrentLevel >= maxLevel`.
  - Hide rules use `oracle.saveSettings.hidePurchased`.

## Data Requirements
- `ResearchDefinition` additions (if needed):
  - `autoBuyGroup` (enum or string) to map to toggles.
  - Optional `isOneShot` (can be inferred from `maxLevel = 1`).
- `ResearchDatabase` is the source of truth for discovery and UI binding.
- Keep existing save toggles:
  - `saveSettings.infinityAutoResearchToggle*` for categories (science/money/assembly/ai/server/data_center/planet).

## Implementation Phases

### Phase A: Inventory + Mapping
- Catalog all research UI elements in the scene and their current scripts.
- Build a mapping table: `ResearchId -> autoBuyGroup + UI card`.
- Confirm which research entries are one-shot (panel lifetime tiers).

### Phase B: Generic Presenter + Level Access
- Add `ResearchPresenter.cs`:
  - `CurrentLevel` getter/setter using `researchLevelsById`, fallback to legacy via `ResearchIdMap`.
  - `Affordable`, `Cost`, `BuyMaxCost`, `NumberToBuy` (reuse logic from `Research`).
  - `Purchase()` and `AutoPurchase()` with cost deduction and level bump.
  - `OwnedText`/`ProductionText` uses definition + current level.
  - Handles one-shot by clamping to `maxLevel` and switching to “Purchased”.
- Add a small helper (if needed) to resolve auto-buy group from definition.

### Phase C: Auto-buy + Toggles
- Replace `ResearchAutoBuy` loop to operate on all `ResearchPresenter` instances.
- Ensure auto-buy checks:
  - Global `prestigeData.infinityAutoResearch` gate.
  - Category toggle gate (science/money/assembly/ai/server/data_center/planet).
  - Per-definition `autoBuyGroup` match.
- Keep `ResearchBuyXSettings` unchanged.
- Leave `AutoResearchToglles` in place but wire it to new groups (mapping table).

### Phase D: Panel Lifetime + Visibility
- Replace `PanelLifetime1` (and any duplicates) with `ResearchPresenter` entries pointing to:
  - `ResearchIdMap.PanelLifetime1..4` definitions.
- Replace `ResearchEnabler` logic with a data-driven hide-purchased rule:
  - Hide if `CurrentLevel >= maxLevel` and `hidePurchased` is true.
- Remove `panelLifetime1..4` bool usage from UI logic (keep booleans in save for compatibility only).

### Phase E: Cleanup + Removal
- Remove per-upgrade scripts:
  - `AssemblyLineUpgrade`, `AiManagerUpgrade`, `ServerManagerUpgrade`, `DataCenterManagerUpgrade`,
    `PlanetManagerUpgrade`, `MoneyMultiUpgrade`, `ScienceBoostUpgrade`, `PanelLifetime1`.
- Remove unused helpers (`ResearchOverlord` if confirmed unused).
- Update scene/prefab references to use `ResearchPresenter`.
- Update `Documentation/ResearchRefactorProgress.md` to document the overhaul.

## Validation Checklist
- Costs/labels match prior UI for each research entry.
- Auto-buy respects toggles and global automation flag.
- Panel lifetime tiers purchase once, update panel lifetime, and hide when purchased (if configured).
- `researchLevelsById` updates correctly and legacy fallback still works on old saves.
- No missing references in scene/prefabs after script removal.

## Risks + Mitigations
- **Risk**: Auto-buy loop could spam purchases.
  - Mitigation: Add a max-iteration guard per frame (similar to current loop) and/or time-slice.
- **Risk**: One-shot research shows wrong “Purchased” state.
  - Mitigation: Treat `maxLevel = 1` as definitive; clamp display and button interactable.
- **Risk**: Legacy saves missing `researchLevelsById`.
  - Mitigation: Maintain fallback from `ResearchIdMap` until migration proven stable.

## Estimated Touch Points
- New: `Assets/Scripts/Research/ResearchPresenter.cs`
- Modify: `Assets/Scripts/Research/ResearchAutoBuy.cs`, `Assets/Scripts/Research/AutoResearchToglles.cs`
- Remove: per-upgrade scripts + `PanelLifetime1.cs` + `ResearchEnabler.cs` (if superseded)
- Prefabs/Scene: research card components updated to `ResearchPresenter`

## Acceptance Criteria
- All research UI cards use the generic presenter with correct costs, labels, and auto-buy behavior.
- No per-research subclass scripts remain.
- Panel lifetime upgrades are driven entirely by `ResearchDefinition` and show correct purchased state.
- Existing saves load without regression (research levels preserved).
