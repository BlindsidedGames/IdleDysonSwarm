# SkillTreeManager

## Purpose and contract
`SkillTreeManager` is the runtime controller for a single skill node in the skill tree UI. It is responsible for:
- rendering the node's current state (owned, available, line visibility/color, and theme colors),
- handling click/right-click behavior (direct buy/unassign vs confirmation flow),
- enforcing purchase and unassign rules before mutating save state,
- coordinating with auto-assign lists/presets when skills are removed,
- exposing effective not-refundable reason labels consumed by confirmation UI.

The node's visual state must always match the purchase constraints enforced by `ShowConfirmation` and `PurchaseSkill`.

## Data flow
1. `UpdateSkill()` refreshes node visibility and visuals from Oracle save state + `SkillDefinition` metadata.
2. Input path:
- In tap-to-buy mode (`skillsBuyOnTap == true`), button interactability reflects purchase availability directly.
- In description mode (`skillsBuyOnTap == false`), the node stays clickable for browsing; the confirmation button enforces purchase gating.
3. Purchase/unassign path:
- `PurchaseSkill()` updates Oracle-owned flags, skill points, fragments, and auto-assign/preset queues.
- `UpdateSkills` event is raised to fan out UI refresh across all nodes/consumers.

## Effective not-refundable rules
`SkillTreeManager` treats a node as effectively not refundable when any of these are true:
1. Direct intrinsic non-refundable: `SkillDefinition.refundable == false`.
2. Direct dynamic lock: this owned skill has an owned entry in `unrefundableWithIds`.
3. Inherited prerequisite lock: this owned skill appears in the transitive `requiredSkillIds` ancestry of an owned
   direct intrinsic non-refundable skill.

Transitive ancestry follows the full root path through `requiredSkillIds` only (not `shadowRequirementIds`).

Confirmation label API:
- `TryGetNotRefundableReasonLabel(out string label)` returns false when refundable.
- Returned labels:
  - `Not Refundable (Including Required Skills)` for direct intrinsic non-refundable skills.
  - `Not Refundable (Due to: <Skill Name>)` for dynamic lock cases.
  - `Not Refundable (Required by: <Skill Name>)` for inherited prerequisite-lock cases.

## Save/load implications
- Skill ownership is stored in Oracle/skill-tree save flags keyed by skill IDs.
- Costs/fragments are read from `SkillDefinition` and applied to `skillPointsTree` / `fragments`.
- Auto-assign and preset queues are modified on assign/unassign and when dependent skills are removed.
- Any ID/schema change must be coordinated with `SkillIdMap`, `SkillDatabase`, and save migration compatibility.

## Visual-state behavior (current)
- Tap-to-buy mode: non-purchasable skills become non-interactable.
- Description mode: nodes remain clickable; non-purchasable and unowned nodes use `notPurchasableNormal` from the current skill-tree color category.
- If a theme asset does not define `notPurchasableNormal`, code falls back to a dimmed `normal` color.
- Color precedence:
  1. Exclusive lock
  2. Non-refundable (owned)
  3. Non-refundable (unowned)
  4. Owned (refundable)
  5. Fragment
  6. No-required
  7. Normal
- Non-refundable node colors come from:
  - `UITheme.skillTreeNonRefundableOwned` for assigned non-refundable nodes (full red),
  - `UITheme.skillTreeNonRefundable` for unassigned non-refundable nodes (greyed red),
  with hardcoded fallback safety only.
- Owned refundable node colors come from `UITheme.skillTreeOwned` (with fallback safety only).
- Purchased overlay visuals are intentionally suppressed; owned state is communicated by button colors.

## Performance notes
- `UpdateSkill()` runs frequently via several update events; avoid expensive allocations or broad graph traversals in this path.
- Dependency traversal methods (`GetOwnedDependentSkillIdsRecursive`/`GetAllDependentSkillIdsRecursive`) are used for unassign operations and can scale with tree size.
- Keep per-frame/theme color changes lightweight; reuse cached definitions/IDs as currently implemented.

## Quick verification
1. In description mode (`skillsBuyOnTap = false`):
- Unowned + purchasable node uses normal color and opens confirmation popup.
- Unowned + not purchasable node uses dim/not-purchasable color but still opens confirmation popup.
- Owned node shows purchased marker and remains browsable.
2. Non-refundable visuals and labels:
- Assign an intrinsic non-refundable skill (for example `banking`) and verify node uses non-refundable colors.
- Verify unassigned non-refundable nodes use the darker/greyer red set and assigned non-refundable nodes use full red.
- Verify an intrinsic non-refundable popup shows `Not Refundable (Including Required Skills)`.
- Assign `shouldersOfGiants` and verify assigned prerequisites in its full required chain (for example
  `scientificPlanets` and its requirements) switch to non-refundable colors.
- Open one of those prerequisites and verify label `Not Refundable (Required by: Shoulders of Giants)`.
- Assign a refundable skill and verify it uses the owned green color set without showing the purchased overlay.
3. Reversion:
- Unassign the top intrinsic non-refundable skill and verify prerequisite colors/labels revert.
4. In tap-to-buy mode (`skillsBuyOnTap = true`):
- Non-purchasable nodes are non-interactable.
- Purchasable nodes are interactable and can be assigned directly.
5. Confirm popup:
- `confirm` button disabled when requirements/cost/exclusive/refundability checks fail.
