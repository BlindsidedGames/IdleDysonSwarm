# Canonical Dream contract

Dream is a deterministic gameplay domain over canonical player state. It does
not depend on Unity components, frame callbacks or presentation objects.
Scene-authored durations and exported upgrade definitions remain explicit
content inputs rather than hidden frontend behavior.

## Tick ownership

One logical Dream interval uses the whole-game speed selected by the shared
game step and a positive duration. Every producer count and progression gate
is captured from the interval-start snapshot. Outputs produced in the interval
cannot themselves produce until the next interval.

The active scheduler owns interval ordering:

1. evaluate one automation boundary, including conversions and at most one
   railgun volley;
2. evaluate automatic Dream reset and Infinity opportunities;
3. run Foundational, Information, education and Space production for the
   elapsed game time;
4. publish timer and production progress.

Owning the former Double Time upgrade now gives permanent 2x whole-game speed.
The legacy enabled/rate/bank fields remain save-compatibility inputs only and
do not form a second Dream clock.

## Foundational and Information eras

Current `Game.unity` production durations are characterized as content
constants:

- Hunters, Gatherers, Community and Cities: 3 seconds;
- Housing: 20 seconds;
- Villages: 12 seconds;
- Workers: 4 seconds;
- Factories: 30 seconds;
- Bots: 20 seconds.

The production contract preserves Unity's logarithmic producer pacing,
community/factory temporary boosts, Worker/Cities/Factories/Bots permanent
boosts, education multipliers, the intentional sub-100 Bot soft start, and
saturating outputs.

Player transactions are immutable and atomic:

- Hunter and Gatherer purchases debit Influence and use the durable
  per-purchase quantities;
- Community and Factory boosts enforce their authored gates, costs and active
  clocks;
- one automation event performs Housing to Village, then Village to City,
  followed by the bulk Rocket plus Factory to Space Factory exchange.

## Education and permanent Simulation upgrades

All 43 exported Simulation-layer upgrade definitions are consumed from the
generated Unity catalog. Purchase order is:

1. resolve the stable upgrade key;
2. reject owned, locked or unaffordable definitions;
3. prove every authored effect has a canonical target;
4. apply effects in authored order;
5. debit Strange Matter.

Effects cover permanent flags, education times/completion, starting and
per-purchase Hunters/Gatherers, Rocket conversion cost, skill points, disaster
stage and Mathematics solar-generation parity.

All six education subjects advance from the same interval multiplier.
Completion preserves overshoot, and Mathematics completion raises solar
generation to at least the current Unity legacy value of 200.

## Space age and reset boundary

Space production and reset behavior must preserve the same separation:

- energy production reads Solar, Fusion and launched Swarm panels;
- Space Factories create Dyson panels through their saved timer;
- railgun charging and volleys occur only on automation boundaries and retain
  durable firing progress;
- Meteor, Artificial Intelligence, Global Warming and Black Hole transitions
  classify their exact Strange Matter rewards before resetting the run;
- permanent upgrades and Strange Matter survive while per-run Dream state is
  replaced and permanent research effects are reapplied.

The reset must update lifetime, current-Quantum-run, recent-segment and windowed
statistics in the same immutable candidate. Presentation alerts and runtime
timer objects are downstream concerns.

Stored Dyson Panels, launched Swarm Panels, Black Hole rewards, Strange Matter
and their Strange Matter statistics share one Simulation-resource ceiling: the
exact non-negative integer represented by JavaScript's maximum finite double
(`Number.MAX_VALUE`). Existing saves at Unity's former signed-64 ceiling retain
their earned value and resume progression without a schema rewrite. Dream reset
counts and unrelated discrete economies retain their own signed-64 contracts.

## Integration gate

Domain-unit coverage does not make Dream part of the canonical whole-game
engine. Completion requires shared-step scheduler routing, command adapters,
deterministic boundary ordering for a supplied update sequence, reset collision
ordering, and commit/reload acceptance through `TransactionalGameApplication`.
Arbitrary partition equivalence is intentionally not required for coarse
Stored Time updates.
