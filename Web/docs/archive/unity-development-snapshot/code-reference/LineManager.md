# LineManager

## Purpose and contract
`LineManager` controls one rendered connection between two skill nodes in the skill tree.

It owns:
- line geometry setup (`SetLine`),
- line color state resolution (`SetColor`) based on skill ownership and gating.

It delegates:
- effective refundability reasoning to `SkillTreeManager.TryGetNotRefundableReasonLabel`,
- ownership/queue/save truth to `Oracle` + `SkillTreeManager`.

## Color-state precedence
`SetColor()` resolves in this order:
1. `colorExclusive` when end skill is blocked by an owned exclusive.
2. `colorDisabled` when the line's end skill is hidden by prestige/first-run gates.
3. `colorNonRefundable` when both connected skills are owned and the destination/end skill is effectively not refundable.
4. `colorOwned` when both connected skills are owned.
5. `colorQueued` when end skill is queued for auto-assignment.
6. `colorAvailable` when start is owned.
7. `colorMissing` when requirement state indicates missing path.
8. `colorDefault` fallback.

## Data flow
1. `SkillTreeManager.MakeLines()` instantiates and wires each line with start/end managers, IDs, keys, and rects.
2. `LineManager.Start()` caches `UILineRenderer`, computes points, and applies initial color.
3. `LineManager` subscribes to skill update events and re-runs `SetColor()` on updates.

## Save/load implications
- No direct save schema changes.
- Reads dynamic state from Oracle ownership and auto-assignment queues.

## Performance notes
- `SetColor()` runs frequently across many lines; manager resolution is ID-based and short-circuits on direct references.
- Non-refundable path checks prefer linked `SkillTreeManager` references to avoid extra database traversal.

## Quick verification
1. Assign a normal refundable chain; owned lines should remain owned color (not red).
2. Assign an intrinsic non-refundable skill with owned prerequisites; connecting owned lines should turn red.
3. Unassign the non-refundable skill; prerequisite path lines should revert from red.
4. Trigger an exclusive lock and verify exclusive color still overrides red.
5. Verify a line from a non-refundable prerequisite into a refundable owned skill remains green (owned), not red.
