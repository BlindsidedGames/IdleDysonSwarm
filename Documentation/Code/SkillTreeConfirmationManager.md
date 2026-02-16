# SkillTreeConfirmationManager

## Purpose and contract
`SkillTreeConfirmationManager` owns the skill confirmation popup shown from skill nodes. It is responsible for:
- opening/closing and positioning the popup,
- rendering skill text (name, description, technical description, cost),
- driving assign/unassign actions through the selected `SkillTreeManager`,
- toggling auto-assign add/remove actions,
- rendering not-refundable warning visibility and reason copy.

The popup must stay consistent with `SkillTreeManager` rules for refundability and reason labeling.

## Data flow
1. `SkillTreeManager.ShowConfirmation()` assigns `skillTreeManager`, then calls `SetTexts()`/`SetPosition()`.
2. `SetTexts()`:
- resolves the active `SkillDefinition`,
- asks `skillTreeManager.TryGetNotRefundableReasonLabel(out label)` for warning state and copy,
- updates message visibility/copy and popup colors (normal/fragment/non-refundable),
- updates auto-assign button visibility from Oracle auto-assignment IDs.
3. Confirm button calls `skillTreeManager.PurchaseSkill()` to execute assign/unassign mutation.

## Not-refundable message behavior
- Message is hidden when `TryGetNotRefundableReasonLabel` returns false.
- Message is shown with exact label returned from `SkillTreeManager` when true.
- Message text supports:
  - `Not Refundable (Including Required Skills)`
  - `Not Refundable (Due to: <Skill Name>)`
  - `Not Refundable (Required by: <Skill Name>)`

## Save/load implications
- No direct save schema changes are owned here.
- Writes occur only through Oracle auto-assign list updates and `PurchaseSkill()` delegation.

## Performance notes
- `SetTexts()` executes on popup open, not per-frame; database lookups and label resolution are acceptable.
- Keep reason-resolution logic in `SkillTreeManager` so confirmation UI remains presentation-focused.

## Quick verification
1. Open popup for an intrinsic non-refundable skill and verify warning label is visible with:
- `Not Refundable (Including Required Skills)`.
2. Open popup for an assigned prerequisite inherited from a non-refundable descendant and verify:
- warning shows `Not Refundable (Required by: <Skill Name>)`.
3. If a dynamic lock (`unrefundableWithIds`) applies, verify warning shows:
- `Not Refundable (Due to: <Skill Name>)`.
4. Open popup for a refundable skill and verify warning is hidden.
