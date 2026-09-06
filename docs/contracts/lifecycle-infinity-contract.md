# Lifecycle and Infinity contract

This contract defines the persistence-sensitive boundary around returned time,
Stored Time, the finite bot cap, and Infinity. The modules are pure: they
produce immutable candidates and explicit intents, while
`TransactionalGameApplication` remains the only owner of durable publication.

## Returned time and lifecycle

Lifecycle policy is owned by the canonical TypeScript runtime:

- mobile pause and focus loss request a timestamped save;
- desktop pause and focus loss are no-ops;
- quit requests a timestamped save on every platform;
- focus gain requests away-time replay without reloading the whole game;
- the cold-start gate permits at most one forced save before replay, and that
  save preserves the historical quit timestamp;
- no later pre-replay lifecycle callback may overwrite that timestamp.

Away-time source selection is explicit and host-independent:

1. a missing quit timestamp grants nothing and remains unconsumed;
2. a valid quit timestamp is authoritative;
3. an invalid quit timestamp falls back to the saved start timestamp;
4. invalid quit and start timestamps fall back to the current UTC sample.

Backward clock movement grants zero and emits an integrity signal. A
non-missing replay consumes the quit timestamp in its canonical candidate so it
cannot be awarded twice.

The returned duration is credited to the Offline Time bank only up to its
capacity. Idle Electric Sheep doubles eligible away-time credit but does not
affect active play or manually spent Offline Time. A visible foreground gap
over 60 seconds uses the same retry-safe credit path instead of becoming one
unbounded active update.

Stored-time capacity upgrades require a full bank, empty that bank, double the
capacity and stop at the ceiling. Spending is started manually and remains a
commit-first application operation: one detached candidate is persisted before
it is published. Cancellation, failure, import or reset discards the complete
uncommitted candidate without charging the bank.

## Overflow boundary and reset

Bots have a gameplay ceiling of `4e242` after Break the Loop. Before that
upgrade, the ordinary Infinity threshold remains the ceiling. General numeric
saturation remains `Number.MAX_VALUE` for other resources and intermediate
calculations. Passive production, Stellar settlement, Tinker and event-time
prediction share the bot boundary.

Reaching the boundary persists `botCapTransitionPending` as voluntary Overflow
eligibility. It grants no Infinity Points, Avocato boost or Overflow Point.
Invalid bot values produce a separate repair candidate that zeros bots and
clears the transition flags. Eligibility survives bot spending and reload.
Automatic and manual Infinity and Quantum resets cannot consume a reached
Overflow boundary.

`avocado.request-overflow-reset` stages one immutable reset candidate and
persists it before publication. It grants exactly one `avocado.overflowPoints`
and clears Dyson, Infinity, Quantum, Reality and Simulation progression,
including all Avocato accumulators and the historical Overflow multiplier.
It clears progression-derived skill points, ownership, timers and Research.
Completed Secrets and their four-point reward survive, as do skill presets,
automation preferences, host purchases and achievements, lifetime statistics,
Offline Time and its capacity. Reality's Double Time upgrade is reset.
Blank Slate completion, its unlock, and the Galvanizer wallet survive Overflow.
Galvanized skill effects and Galvanizer spending are not implemented. See
`infinity-challenges-contract.md` for challenge reset and reward rules.

Overflow Points currently have no production effect or spending action. The
balance and reset confirmation live in Avocato. A failed save preserves the
entire old run. The successful reset clears eligibility and bots in the same
write as the point increment, making retries and reloads idempotent.

Schema 15 adds the point balance. Legacy finite bot balances above `4e242`
are capped with a numeric-repair notice; existing currencies and historical
Avocato bonuses are preserved until the player chooses Overflow. Historical
automatic-reward flags do not count as consent or grant new currency.
Transitional V2 imports start with zero Overflow Points and cannot inherit
that balance from the receiving save's compatibility base.

## Infinity reset ownership

The reset transition may replace only the Dyson run, Research runtime, Skill
runtime, and Infinity-cycle metadata defined by the canonical reset contract.
Dream, Reality, Quantum, Avocado, secret progress, permanent progression, and
unrelated statistics are preserved.

The pure reset must:

- grant the already-classified ordinary or Break reward with saturating
  arithmetic and record the actual admitted delta;
- roll current stored-time usage into the previous-cycle field;
- retain ten manually owned units for each selected basic facility;
- start with ten bots when Assembly Line retention is active, otherwise one;
- rebuild available skill points from permanent, banked and explicitly
  supplied platform/artifact points;
- clear skill ownership, timers and fragments, then run dependency-aware
  auto-assignment in stable queued order;
- clear Infinity and bot-cap transition flags and mark the tutorial/first
  Infinity metadata complete.

Infinity Shop retention purchases prove that exactly ten manual facility units
are representable before spending the discrete Infinity Point. An extreme or
imported ownership value that would round that output above or below ten fails
closed without changing ownership, retention, or spent-point state.

The event-time coordinator, not the pure reset, owns automation phases,
Infinity-boundary phase, run clock and starting-point rollover. This separation
prevents an internal reset helper from silently disturbing deterministic
scheduler state.

## Runtime integration

The canonical engine routes candidates through the transactional application,
persists each checkpoint through the verified lane, and orders Infinity with
Dream and the remaining prestige domains before snapshot publication.
