# SkillTreeManager

## Purpose and contract
`SkillTreeManager` is the runtime controller for a single skill node in the skill tree UI. It is responsible for:
- rendering the node's current state (owned, available, line visibility/color, and theme colors),
- handling click/right-click behavior (direct buy/unassign vs confirmation flow),
- enforcing purchase and unassign rules before mutating save state,
- coordinating with auto-assign lists/presets when skills are removed.

The node's visual state must always match the purchase constraints enforced by `ShowConfirmation` and `PurchaseSkill`.

## Data flow
1. `UpdateSkill()` refreshes node visibility and visuals from Oracle save state + `SkillDefinition` metadata.
2. Input path:
- In tap-to-buy mode (`skillsBuyOnTap == true`), button interactability reflects purchase availability directly.
- In description mode (`skillsBuyOnTap == false`), the node stays clickable for browsing; the confirmation button enforces purchase gating.
3. Purchase/unassign path:
- `PurchaseSkill()` updates Oracle-owned flags, skill points, fragments, and auto-assign/preset queues.
- `UpdateSkills` event is raised to fan out UI refresh across all nodes/consumers.

## Save/load implications
- Skill ownership is stored in Oracle/skill-tree save flags keyed by skill IDs.
- Costs/fragments are read from `SkillDefinition` and applied to `skillPointsTree` / `fragments`.
- Auto-assign and preset queues are modified on assign/unassign and when dependent skills are removed.
- Any ID/schema change must be coordinated with `SkillIdMap`, `SkillDatabase`, and save migration compatibility.

## Visual-state behavior (current)
- Tap-to-buy mode: non-purchasable skills become non-interactable.
- Description mode: nodes remain clickable; non-purchasable and unowned nodes use `notPurchasableNormal` from the current skill-tree color category.
- If a theme asset does not define `notPurchasableNormal`, code falls back to a dimmed `normal` color.

## Performance notes
- `UpdateSkill()` runs frequently via several update events; avoid expensive allocations or broad graph traversals in this path.
- Dependency traversal methods (`GetOwnedDependentSkillIdsRecursive`/`GetAllDependentSkillIdsRecursive`) are used for unassign operations and can scale with tree size.
- Keep per-frame/theme color changes lightweight; reuse cached definitions/IDs as currently implemented.

## Quick verification
1. In description mode (`skillsBuyOnTap = false`):
- Unowned + purchasable node uses normal color and opens confirmation popup.
- Unowned + not purchasable node uses dim/not-purchasable color but still opens confirmation popup.
- Owned node shows purchased marker and remains browsable.
2. In tap-to-buy mode (`skillsBuyOnTap = true`):
- Non-purchasable nodes are non-interactable.
- Purchasable nodes are interactable and can be assigned directly.
3. Confirm popup:
- `confirm` button disabled when requirements/cost/exclusive/refundability checks fail.
