# Canonical Quantum and Avocado contract

Quantum and Avocado are durable gameplay domains. Their command handlers own
access rules, costs and atomic state changes; presentation may display those
rules but must not be their authority.

## Quantum upgrades

The canonical catalog covers all 20 `QuantumUpgradeType` values. Seventeen
definitions come from the generated content catalog. Matrioshka Brains, Birch
Planets, and Galactic Brains use explicit TypeScript compatibility constants
until those records move into a Web-owned authored catalog.

Purchases debit available Quantum Points (`pointsEarned - pointsSpent`) only
after proving the effect can be applied. The observable UI access graph is part
of the command contract:

- Secrets requires Bot Multitasking or Double IP and adds three permanent and
  current-session Secrets, capped at 27;
- Division requires both Bot Multitasking and Double IP, costs
  `2 * 2^purchases`, and stops after 19 purchases;
- mega-structure Quantum upgrades are purchased sequentially;
- Automation also enables both Infinity automation capabilities;
- Influence Speed adds four, while Cash and Science add one level each.

Each purchased mega-structure unlock is permanent. It reveals and permits
manual or automated purchase of that structure after a reset even when the
preceding facility currently has zero ownership. Historical facility
prerequisites in the deprecated Unity compatibility capsule do not apply to
the canonical TypeScript runtime. Manual purchase and automation use the same
eligibility rule and still charge the selected structure's canonical price.

## Quantum Leap paths

The visible Leap action is gated by total Infinity Points reaching 42.
Scheduler/command integration owns that gate.

Without Quantum Entanglement, the Leap replaces both legacy-compatible Dyson
run containers, grants one Quantum Point, clears the Dyson run, Research, Skill
ownership, Infinity currencies and current/recent Quantum-run statistics, then
restores permanent Secrets, permanent Automation, mega unlocks and explicitly
supplied artifact skill points before auto-assignment.

With Quantum Entanglement, no reset occurs. Complete groups of 42 unspent
Infinity Points are atomically converted to Quantum Points; spent Infinity
bookkeeping and the unconverted remainder remain.

## Avocado

The feed commands move the complete currently representable portion of the
available source balance:

- unspent Infinity Points;
- Influence;
- Strange Matter.

Influence and Strange Matter use one identical represented debit and credit;
any coarse-precision remainder stays in its source. Infinity Points are debited
only by the exact whole units admitted by the continuous accumulator. A
sub-ULP feed rejects without changing either side.

The production multiplier is neutral while locked. Once unlocked, each
accumulator contributes `log10(value)` only at the authored threshold of ten;
below-threshold components remain `x1`. Overflow contributes `1 + overflow`
only once overflow reaches one. Transactions fail before debiting when the
continuous accumulator cannot increase.

Serialization also mirrors `avocado.unlocked` into the legacy
`prestigePlus.avocatoPurchased` field. `QuantumUpgradeCondition` still reads
that legacy bit even though `AvocadoData` owns the gameplay state.

The legacy Avocado text panel multiplies zero-valued display components below
threshold, but ModifierSystem, facility statistics and `AvocadoService` all
use neutral components. The canonical backend follows the gameplay pipelines,
not that presentation-only discrepancy.

## Runtime integration

The whole-game command router and scheduler own Leap visibility, reset
collisions, commit/reload behavior, and snapshot publication. The frontend does
not reimplement these rules.
