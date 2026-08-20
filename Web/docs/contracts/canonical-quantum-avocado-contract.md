# Canonical Quantum and Avocado contract

Quantum and Avocado are durable gameplay domains. Their command handlers own
access rules, costs and atomic state changes; presentation may display those
rules but must not be their authority.

## Quantum upgrades

The canonical catalog covers all 20 `QuantumUpgradeType` values. Seventeen
definitions come from the exported `QuantumUpgradeDatabase`. Matrioshka
Brains, Birch Planets and Galactic Brains intentionally use the current Unity
compatibility constants because they have no database assets.

Purchases debit available Quantum Points (`pointsEarned - pointsSpent`) only
after proving the effect can be applied. The observable UI access graph is part
of the command contract:

- Secrets requires Bot Multitasking or Double IP and adds three permanent and
  current-session Secrets, capped at 27;
- Division requires both Bot Multitasking and Double IP, costs
  `2 * 2^purchases`, and stops after 19 purchases;
- mega-structure unlocks are sequential;
- Automation also enables both Infinity automation capabilities;
- Influence Speed adds four, while Cash and Science add one level each.

## Quantum Leap paths

The visible Leap action is gated by total Infinity Points reaching 42.
Scheduler/command integration owns that gate.

Without Quantum Entanglement, the Leap replaces both Unity DysonVerse
containers, grants one Quantum Point, clears the Dyson run, research, skill
ownership, Infinity currencies and current/recent Quantum-run statistics, then
restores permanent Secrets, permanent Automation, mega unlocks and explicitly
supplied artifact skill points before auto-assignment.

With Quantum Entanglement, no reset occurs. Complete groups of 42 unspent
Infinity Points are atomically converted to Quantum Points; spent Infinity
bookkeeping and the unconverted remainder remain.

## Avocado

The feed commands drain the complete currently available source balance:

- unspent Infinity Points;
- Influence;
- Strange Matter.

The production multiplier is neutral while locked. Once unlocked, each
accumulator contributes `log10(value)` only at the authored threshold of ten;
below-threshold components remain `x1`. Overflow contributes `1 + overflow`
only once overflow reaches one. Transactions fail before debiting when the
continuous accumulator cannot increase.

Serialization also mirrors `avocado.unlocked` into Unity's legacy
`prestigePlus.avocatoPurchased` field. `QuantumUpgradeCondition` still reads
that legacy bit even though `AvocadoData` owns the gameplay state.

The legacy Avocado text panel multiplies zero-valued display components below
threshold, but ModifierSystem, facility statistics and `AvocadoService` all
use neutral components. The canonical backend follows the gameplay pipelines,
not that presentation-only discrepancy.

## Integration gate

These pure transitions still require registration in the whole-game command
router and event scheduler. Integration must prove Leap visibility/gating,
reset collision ordering, commit/reload behavior, and snapshot publication
without re-implementing rules in the frontend.
