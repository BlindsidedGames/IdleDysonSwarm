# SkillsAutoAssignment

## Purpose and scope
- Executes queued skill auto-assignment against current skill points and unlock rules.
- Owns queue traversal behavior and assignment gating for requirements, exclusives, and intrinsic non-refundable policy.

## Runtime context / entry points
- Runtime `MonoBehaviour`.
- Entry points:
  - `OnEnable` / `OnDisable` subscribe/unsubscribe assignment events.
  - `UnlockSkill()` processes queued assignments.

## Interacts with
- Calls:
  - `Oracle.GetAutoAssignmentSkillIds`
  - `Oracle.SetSkillOwned`
  - `Oracle.saveSettings.autoAssignNonRefundableSkills`
  - `GameDataRegistry.skillDatabase`
  - `GameManager.UpdateSkillsInvoke`
- Called by:
  - `GameManager.AutoAssignSkillsInvoke` via `GameManager.AssignSkills`
  - `DebugOptions.AutoAssign`

## Data flow and behavior
- Reads live queued ids from save data.
- Iterates queue repeatedly while at least one skill is assigned and points remain.
- For each queued skill:
  - skips null/missing/already owned entries
  - verifies cost, required/shadow prerequisites, exclusives
  - when `autoAssignNonRefundableSkills` is false, skips `SkillDefinition.refundable == false`
- Uses skip-blocked semantics (`continue`) rather than fail-fast (`break`) so malformed queue ordering cannot stall other valid assignments.

## Save/load implications
- Does not write queue ordering itself; it consumes the queue produced by preset/load/import paths.
- Honors persisted setting `SaveDataSettings.autoAssignNonRefundableSkills`.

## Performance notes
- Queue pass is O(n) per loop and may loop multiple times while assignments continue.
- Keep gating checks lightweight; avoid allocations inside the hot loop.

## Quick verification
1. Build queue where dependent appears before prerequisite and ensure auto-assign still spends available points on valid later entries.
2. With `autoAssignNonRefundableSkills = true`, verify intrinsic non-refundable skill can auto-assign.
3. With `autoAssignNonRefundableSkills = false`, verify intrinsic non-refundable skill is skipped while refundable skills still assign.
4. Verify no assignment occurs when prerequisites/exclusives are unmet.
