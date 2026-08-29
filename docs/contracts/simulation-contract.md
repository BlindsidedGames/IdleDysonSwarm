# Authoritative simulation contract

This document defines the durable numeric and state-safety rules for Idle Dyson
Swarm. Update cadence, active play and Offline Time are defined by
`game-processing-and-offline-time-contract.md`.

## Source and scope

- Supported legacy saves remain compatibility input only.
- Checked-in characterization fixtures are regression evidence, while current
  TypeScript contracts and tests own gameplay formulas, reset rewards, and
  progression.
- The processing rewrite does not make Antimatter Dimensions gameplay a source
  of IDS balance or progression rules.
- Old exact-event, 100 ms partition-equivalence and 4,096 representative-cycle
  requirements are retired. Tests that encode those requirements are not
  acceptance criteria for the shared coarse-step engine.

## Numeric categories

- JavaScript `number` stores continuous/high-scale resources, rates,
  multipliers, timers and durations.
- `bigint` stores genuinely discrete currencies, counters, ownership counts and
  reset totals.
- Bounded enums, indices, authored settings and versions use `number` only
  after integer/range validation.
- Gameplay state must remain finite. Technical `NaN` and infinities are
  invalid; gameplay Overflow is a separate mechanic.
- Saturating numeric helpers must be used where large finite inputs can exceed
  JavaScript's finite range.

## Update invariants

- Active play and manually spent Offline Time call the same gameplay update.
- All permanent gains committed by one update are visible to the next update.
- Each update has at most one automation, automatic Dream-reset and automatic
  Infinity opportunity.
- Dream resolves before Infinity when both are eligible at one boundary.
- A railgun can fire at most one volley per update.
- Facilities acquired or restored at a boundary produce only after that
  boundary.
- Tinker advances only in active play and is intentionally frozen during
  Stored Time.
- Game speed affects gameplay time, not UI, input, persistence, worker budgets
  or rate-clock time.

## Persistence boundary

- Raw decoded saves cannot construct an engine. Decode, migration, repair and
  validation produce the prepared-save proof used by startup and import.
- Stored Time operates on one isolated candidate and one total update budget.
- A candidate becomes visible only after its matching save and bank deduction
  are durably committed.
- Cancellation, worker failure, invalid candidate or persistence failure
  preserves the complete source state and bank.
- Reset rewards, bot-cap rewards, migrations and one-time flags must remain
  idempotent across save/reload boundaries.
- Active state revision and durable save revision are separate. Rejected,
  stale and no-op commands advance neither.

## Validation

Tests should assert gameplay-domain formulas, update ordering, determinism for
an identical boundary sequence, atomic Stored Time behavior, migration and save
round trips. Accuracy evaluation compares supported presets and selected
fine-step sentinels across meaningful stages; it does not demand equality with
the retired exact scheduler or arbitrary repartitioning of coarse updates.
